import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
const cache = new Map<string, Record<string, string>>();

/**
 * Fetches a JSON secret from AWS Secrets Manager and caches it for the
 * lifetime of the Lambda container.
 */
export async function getSecret(arn: string): Promise<Record<string, string>> {
  const cached = cache.get(arn);
  if (cached) return cached;
  const result = await client.send(new GetSecretValueCommand({ SecretId: arn }));
  if (!result.SecretString) {
    throw new Error(`Secret ${arn} has no string value`);
  }
  const parsed = JSON.parse(result.SecretString) as Record<string, string>;
  cache.set(arn, parsed);
  return parsed;
}
