import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from 'aws-cdk-lib';
import { HttpApi, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, OutputFormat } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import type { Construct } from 'constructs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

const DB_NAME = 'neurosemantics';
const APP_SCHEME_REDIRECT = 'neurosemantics://redirect';

/**
 * The entire system: one HTTP API, one Lambda, one database, one user pool,
 * one application secret. CloudWatch logging comes with Lambda by default.
 */
export class NeuroSemanticsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // --- Network (required by RDS; one NAT gateway for outbound HTTPS) ---
    const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2, natGateways: 1 });

    // --- Database: Aurora Serverless v2, PostgreSQL ---
    const db = new rds.DatabaseCluster(this, 'Database', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_16_4,
      }),
      writer: rds.ClusterInstance.serverlessV2('Writer'),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      defaultDatabaseName: DB_NAME,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      storageEncrypted: true,
      removalPolicy: RemovalPolicy.SNAPSHOT,
    });

    // --- Application secret (filled in manually after first deploy) ---
    const appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: 'neurosemantics/app',
      description:
        'OPENAI_API_KEY, APPLE_SHARED_SECRET, GOOGLE_SERVICE_ACCOUNT_JSON for NeuroSemantics AI',
    });

    // --- Authentication: Cognito with Apple, Google and email ---
    const userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: { minLength: 10 },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const domainPrefix = this.node.tryGetContext('cognitoDomainPrefix') ?? 'neurosemantics';
    const domain = userPool.addDomain('Domain', { cognitoDomain: { domainPrefix } });

    // Apple/Google federation requires developer credentials; provide them via
    // CDK context to enable. Email sign-in works without any of this.
    const providers: cognito.UserPoolClientIdentityProvider[] = [
      cognito.UserPoolClientIdentityProvider.COGNITO,
    ];
    const googleClientId = this.node.tryGetContext('googleClientId');
    const googleClientSecret = this.node.tryGetContext('googleClientSecret');
    if (googleClientId && googleClientSecret) {
      new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
        userPool,
        clientId: googleClientId,
        clientSecretValue: secretsmanager.Secret.fromSecretNameV2(
          this,
          'GoogleSecretRef',
          googleClientSecret,
        ).secretValue,
        scopes: ['openid', 'email'],
        attributeMapping: { email: cognito.ProviderAttribute.GOOGLE_EMAIL },
      });
      providers.push(cognito.UserPoolClientIdentityProvider.GOOGLE);
    }
    const appleTeamId = this.node.tryGetContext('appleTeamId');
    const appleKeyId = this.node.tryGetContext('appleKeyId');
    const applePrivateKeySecretName = this.node.tryGetContext('applePrivateKeySecretName');
    if (appleTeamId && appleKeyId && applePrivateKeySecretName) {
      new cognito.UserPoolIdentityProviderApple(this, 'Apple', {
        userPool,
        clientId: 'com.neurosemantics.app.signin',
        teamId: appleTeamId,
        keyId: appleKeyId,
        privateKeyValue: secretsmanager.Secret.fromSecretNameV2(
          this,
          'AppleKeyRef',
          applePrivateKeySecretName,
        ).secretValue,
        scopes: ['email'],
        attributeMapping: { email: cognito.ProviderAttribute.APPLE_EMAIL },
      });
      providers.push(cognito.UserPoolClientIdentityProvider.APPLE);
    }

    const userPoolClient = userPool.addClient('MobileClient', {
      generateSecret: false,
      authFlows: { userSrp: true },
      supportedIdentityProviders: providers,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
        callbackUrls: [APP_SCHEME_REDIRECT],
        logoutUrls: [APP_SCHEME_REDIRECT],
      },
    });

    // --- The single backend Lambda ---
    const apiFunction = new NodejsFunction(this, 'Api', {
      entry: join(repoRoot, 'services', 'api', 'src', 'handler.ts'),
      runtime: Runtime.NODEJS_22_X,
      memorySize: 512,
      timeout: Duration.seconds(30),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      logRetention: logs.RetentionDays.ONE_MONTH,
      bundling: {
        format: OutputFormat.ESM,
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: () => [],
          afterBundling: (inputDir, outputDir) => [
            `cp -r ${inputDir}/services/api/knowledge ${outputDir}/knowledge`,
          ],
        },
      },
      environment: {
        APP_SECRET_ARN: appSecret.secretArn,
        DB_SECRET_ARN: db.secret?.secretArn ?? '',
        DB_NAME,
        KNOWLEDGE_DIR: 'knowledge',
        FREE_MESSAGE_LIMIT: '50',
        USAGE_RESET_DAYS: '30',
      },
    });
    appSecret.grantRead(apiFunction);
    db.secret?.grantRead(apiFunction);
    db.connections.allowDefaultPortFrom(apiFunction);

    // --- HTTP API with Cognito JWT authorization ---
    const authorizer = new HttpJwtAuthorizer(
      'JwtAuthorizer',
      `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      { jwtAudience: [userPoolClient.userPoolClientId] },
    );
    const api = new HttpApi(this, 'HttpApi', { defaultAuthorizer: authorizer });
    const integration = new HttpLambdaIntegration('ApiIntegration', apiFunction);
    api.addRoutes({ path: '/me', methods: [HttpMethod.GET], integration });
    api.addRoutes({ path: '/chat', methods: [HttpMethod.POST], integration });
    api.addRoutes({ path: '/subscription/verify', methods: [HttpMethod.POST], integration });

    new CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
    new CfnOutput(this, 'CognitoDomain', { value: domain.baseUrl() });
  }
}
