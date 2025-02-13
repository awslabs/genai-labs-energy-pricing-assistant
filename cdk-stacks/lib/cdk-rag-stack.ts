import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { bedrock } from '@cdklabs/generative-ai-cdk-constructs';

const KNOWLEDGE_BASE_NAME = 'EnergyPricingAssistantKB';
const KNOWLEDGE_DATA_SOURCE = 'EnergyPricingAssistantDS';
const KNOWLEDGE_BASE_DESC = 'Knowledge base to strategy reports and support documents';

export interface CdkRagStackProps extends cdk.StackProps {
  readonly dataBucket: s3.Bucket;
}

export class CdkRagStack extends cdk.Stack {
  public readonly knowledgebaseId: string;

  constructor(scope: Construct, id: string, props: CdkRagStackProps) {
    super(scope, id, props);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'This is an IAM role used in cloudformation custom resource not used in the actual architecture.'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'This is an IAM role used in cloudformation custom resource not used in the actual architecture.'
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'To be compatible with AWS provided layers.'
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Public data stored in the S3 bucket and served from CloudFront.'
      }
    ])

    const kb = new bedrock.KnowledgeBase(this, `EnergyPricingAssistantKB`, {
      name: KNOWLEDGE_BASE_NAME,
      description: KNOWLEDGE_BASE_DESC,
      embeddingsModel: bedrock.BedrockFoundationModel.TITAN_EMBED_TEXT_V1
    });

    const datasource = new bedrock.S3DataSource(this, 'EnergyPricingAssistantDS', {
      bucket: props.dataBucket,
      knowledgeBase: kb,
      dataSourceName: KNOWLEDGE_DATA_SOURCE,
      chunkingStrategy: bedrock.ChunkingStrategy.fixedSize({
        maxTokens: 500,
        overlapPercentage: 20,
      })
    }
    );

    this.knowledgebaseId = kb.knowledgeBaseId;

    // print the knowledge base ID
    new cdk.CfnOutput(this, 'KnowledgebaseId', {
      value: this.knowledgebaseId,
    });
  }
}