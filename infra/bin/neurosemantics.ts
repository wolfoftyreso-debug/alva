import { App } from 'aws-cdk-lib';
import { NeuroSemanticsStack } from '../lib/neurosemantics-stack.js';

const app = new App();

new NeuroSemanticsStack(app, 'NeuroSemantics', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'eu-north-1',
  },
});
