import { App } from 'aws-cdk-lib';
import { SemantikaStack } from '../lib/semantika-stack.js';

const app = new App();

new SemantikaStack(app, 'Semantika', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-north-1',
  },
});
