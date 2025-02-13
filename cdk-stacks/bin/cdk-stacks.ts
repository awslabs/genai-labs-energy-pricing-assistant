#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkDataPipelineStack } from '../lib/cdk-data-pipeline-stack';
import { CdkRagStack } from '../lib/cdk-rag-stack';
import { CdkAgentStack } from '../lib/cdk-agent-stack'
const STACK_PREFIX = "EnergyPricingAssistant"
const app = new cdk.App();
import { AwsSolutionsChecks } from 'cdk-nag'
import { Aspects, Tags } from 'aws-cdk-lib';

const application_version = app.node.tryGetContext('application_version')
console.log("VERSION: ", application_version)

// Deploy backend and frontend stacks here
console.log("ACCOUNT: ", process.env.CDK_DEFAULT_ACCOUNT)
console.log("REGION: ", process.env.CDK_DEFAULT_REGION)

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }))

const dataIngestionStack = new CdkDataPipelineStack(app, `${STACK_PREFIX}DataPipelineStack`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
Tags.of(dataIngestionStack).add('project', 'genai-labs-energy-pricing-assistant')

const ragStack = new CdkRagStack(app, `${STACK_PREFIX}KBStack`, { 
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  dataBucket: dataIngestionStack.processedDataBucket 
});
Tags.of(ragStack).add('project', 'genai-labs-energy-pricing-assistant')

const cdkagent = new CdkAgentStack(app, `${STACK_PREFIX}AgentStack`, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  knowledgeBaseId: ragStack.knowledgebaseId,
  docCloudfrontDistribution: dataIngestionStack.cfDomain,
});

Tags.of(cdkagent).add('project', 'genai-labs-energy-pricing-assistant')

