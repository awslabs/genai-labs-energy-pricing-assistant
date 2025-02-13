import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { NagSuppressions } from 'cdk-nag';

export class CdkDataPipelineStack extends cdk.Stack {
  public readonly processedDataBucket: s3.Bucket;
  public readonly rawDataBucket: s3.Bucket;
  public readonly cfDomain: string;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-S1',
        reason: 'This is the Bucket for public data.'
      },
      {
        id: 'AwsSolutions-IAM4',
        reason: 'This is the stack only for preprocessing data, not runtime stack.'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'This is the stack only for preprocessing data, not runtime stack.'
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'To be compatible with AWS provided layers.'
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Public data stored in the S3 bucket and served from CloudFront.'
      },
      {
        id: 'AwsSolutions-CFR1',
        reason: 'Geo restrictons not required for this demo.'
      },
      {
        id: 'AwsSolutions-CFR7',
        reason: 'Demo purposes.'
      }
    ])

    const appName = 'EnergyPricingAssistant'

    this.processedDataBucket = new s3.Bucket(this, 'ProcessedDataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    new s3_deploy.BucketDeployment(this, 'DeployStrategies', {
      sources: [s3_deploy.Source.asset('lib/data')],
      destinationBucket: this.processedDataBucket
    });

    const awsSdkPandasLayerArn = `arn:aws:lambda:${this.region}:336392948345:layer:AWSSDKPandas-Python311-Arm64:12`;
    const awsSdkPandasLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'AWSSDKPandas', awsSdkPandasLayerArn);

    const cfDistribution = new CloudFrontToS3(this, 'EnergyPricingAssistantDocuments', {
      existingBucketObj: this.processedDataBucket
    });

    this.processedDataBucket = this.processedDataBucket;
    this.rawDataBucket = this.rawDataBucket;
    this.cfDomain = cfDistribution.cloudFrontWebDistribution.domainName;

    new cdk.CfnOutput(this, 'CloudFrontDistribution', {
      value: this.cfDomain,
    });
  }
}