import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { RemovalPolicy, Duration, DockerImage } from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { NagSuppressions } from 'cdk-nag';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2_integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as python from '@aws-cdk/aws-lambda-python-alpha';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { execSync, ExecSyncOptions } from 'child_process';
import * as fsExtra from 'fs-extra';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { WebSocketLambdaAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as waf from 'aws-cdk-lib/aws-wafv2';
import { CdkBedrockFlowStack } from '../lib/cdk-bedrock-flow'

const SSM_COGNITO_PARAM_PATH = 'cognitoConfig'

export interface CdkAgentStackProps extends cdk.StackProps {
  readonly knowledgeBaseId: string;
  readonly docCloudfrontDistribution: string;
}

export class CdkAgentStack extends cdk.Stack {

  public readonly webAppBucket: s3.IBucket;
  public readonly demoAssetsBucket: s3.IBucket;
  public readonly accessLogsBucket: s3.IBucket;
  public readonly backendApiEndpoint: string;
  public readonly backendApiId: string;
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;
  public readonly userPoolDomain: cognito.CfnUserPoolDomain;

  constructor(scope: Construct, id: string, props: CdkAgentStackProps) {

    super(scope, id, props);

    const demoFullName = "genai-labs-energy-pricing-assistant"

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM4',
        reason: 'AWSLambdaBasicExecutionRole is required for the Lambda function to log to CloudWatch.'
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'AWSLambdaBasicExecutionRole is required for the Lambda function to log to CloudWatch.'
      },
      {
        id: 'AwsSolutions-S1',
        reason: 'Public data stored in the S3 bucket.'
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'To be compatible with AWS provided layers.'
      },
      {
        id: 'AwsSolutions-CFR4',
        reason: 'Using CloudFront Provided Cert which defaults this to TLS1.  Hoping to avoid customer needing to provision cert just to deploy solution.'
      },
      {
        id: 'AwsSolutions-APIG4',
        reason: 'Auth is handled by Lambda Authorizer upon WebSocket API connect'
      },
      {
        id: 'AwsSolutions-COG1',
        reason: 'Use Amazon Federate auth.'
      },
      {
        id: 'AwsSolutions-COG3',
        reason: 'Use Amazon Federate auth.'
      },
      {
        id: 'AwsSolutions-APIG1',
        reason: 'Demo purposes.'
      },
      {
        id: 'AwsSolutions-CFR7',
        reason: 'Demo purposes.'
      }
    ])

    const appName = 'EnergyPricingAssistant'
    const claudeModel = 'anthropic.claude-3-haiku-20240307-v1:0'
    const novaModel = 'amazon.nova-lite-v1:0'
    const cognitoIdentifier = `energypricingassistant${this.account}`

    // Create a User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${appName}-UserPool`,
      removalPolicy: RemovalPolicy.DESTROY,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true
      },
      autoVerify: { 
        email: true, 
      },    
      standardAttributes: {
        email: {
          required: true, 
          mutable: true
        }
      }
    });

    const userPoolDomain = new cognito.CfnUserPoolDomain(this, 'UserPoolDomain', {
      domain: cognitoIdentifier,
      userPoolId: userPool.userPoolId,
  });

    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: `${appName}-OAC`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4'
      }
    });

    // Create the S3 bucket for website content
    const bucket = new s3.Bucket(this, 'GenAiChatbotS3BucketContent', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    
    const webAcl = new waf.CfnWebACL(this, 'CloudFrontWebAcl', {
      defaultAction: { allow: {} },
      scope: 'CLOUDFRONT',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${appName}-WAF-Metrics`,
        sampledRequestsEnabled: true,
      },
      name: `${appName}-WAF`,
      rules: [
        // AWS Managed Rules
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSetMetric',
            sampledRequestsEnabled: true,
          },
        },
        // Rate limiting rule
        {
          name: 'RateLimitRule',
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 2000, // Requests per 5 minutes per IP
              aggregateKeyType: 'IP',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
            sampledRequestsEnabled: true,
          },
        }
      ],
    });

    // website cloudfront
    const cloudfrontToS3 = new CloudFrontToS3(this, 'CloudfrontDist', {
      existingBucketObj: bucket,
      insertHttpSecurityHeaders: false,
      cloudFrontDistributionProps: {
        webAclId: webAcl.attrArn,
        defaultBehavior: {
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
          responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html'
          }
        ],
      },
    });
    const websiteCloudFrontDistribution = cloudfrontToS3.cloudFrontWebDistribution;


    // Create the User Pool client
    const userPoolClient = userPool.addClient('GenAILabsUserPoolClient', {
      userPoolClientName: cognitoIdentifier,
      generateSecret: false,
      refreshTokenValidity: Duration.minutes(60),
      authFlows: {
          userSrp: true,
      }          
    });

    // Create the S3 bucket for conversation history
    const conversationHistoryBucket = new s3.Bucket(this, 'ConversationHistoryBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      enforceSSL: true,
    });

    // Db
    const dynamodbConversationsTable = new dynamodb.Table(this, 'dynamodb_conversations_table', {
      partitionKey: {
        name: 'session_id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    const dynamodbFuelStations = new dynamodb.Table(this, 'dynamodb_fuel_stations', {
      partitionKey: {
        name: 'station',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'id',
        type: dynamodb.AttributeType.NUMBER
      },
      removalPolicy: RemovalPolicy.DESTROY
    });

    const dynamodbSyntheticStationData = new dynamodb.Table(this, 'dynamodb_synthetic_station_data', {
      partitionKey: {
        name: 'station',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER
      },
      timeToLiveAttribute: 'expirationtime',
      removalPolicy: RemovalPolicy.DESTROY
    });

    const dynamodbAIRecommendations = new dynamodb.Table(this, 'dynamodb_ai_recommendations', {
      partitionKey: {
        name: 'station',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER
      },
      timeToLiveAttribute: 'expirationtime',
      removalPolicy: RemovalPolicy.DESTROY
    });

    // Create a Lambda layer for the Boto3 library
    const boto3Layer = new python.PythonLayerVersion(this, 'Boto3Layer', {
      entry: 'lambdas/layers/boto3',
      compatibleRuntimes: [lambda.Runtime.PYTHON_3_12],
      bundling: {
        command: [
          'bash',
          '-c',
          'pip install -r requirements.txt -t /asset-output/python && cp -au . /asset-output/python',
        ],
      },
    });

    // Add Powertools layer
    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'PowertoolsLayer',
      `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:69`
    );

    // create authorizer lambda
    const authorizerLambda = new NodejsFunction(this,
      "AuthLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: "lambdas/websocket/authorizer.ts",
        environment: {
          USER_POOL_ID: userPool.userPoolId,
          USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        },
        depsLockFilePath: 'lambdas/websocket/package-lock.json',
        bundling: {
          nodeModules: ['@aws-sdk/client-apigatewaymanagementapi', 'aws-jwt-verify'],
        },
      }
    );

    const connectLambda = new NodejsFunction(this,
      "WSConnectLambda",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "handler",
        entry: "lambdas/websocket/connect.ts",
        depsLockFilePath: 'lambdas/websocket/package-lock.json',
        bundling: {
          nodeModules: ['@aws-sdk/client-apigatewaymanagementapi'],
        },
      }
    );
    const authorizer = new WebSocketLambdaAuthorizer('Authorizer',
      authorizerLambda,
      {
        identitySource: ["route.request.querystring.idToken"],
      }
    );

    // Create a WebSocket API
    const websocketApi = new apigwv2.WebSocketApi(this, 'ChatbotWebSocketApi',
      {
        apiName: 'ChatbotWebSocketApi',
        description: 'WebSocket API for the chatbot',
        connectRouteOptions: {
          integration: new apigwv2_integrations.WebSocketLambdaIntegration('ConnectIntegration', connectLambda),
          authorizer: authorizer,
        },
      }
    );
    const websocketApiEndpoint = websocketApi.apiEndpoint;

    new apigwv2.WebSocketStage(this, 'ApiStage', {
      webSocketApi: websocketApi,
      stageName: 'ws',
      autoDeploy: true,
    });

    // Create the historical data access Lambda function to be called by Prompt Flow
    const lambdaFnQueryHistorical = new lambda.Function(this, 'StationHistoricalDataAccess', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambdas/query_historical_data'),
      timeout: Duration.seconds(900),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 1024,
      logRetention: logs.RetentionDays.FIVE_DAYS,
      layers: [boto3Layer, powertoolsLayer],
      environment: {
        DYNAMODB_TABLE_NAME: dynamodbSyntheticStationData.tableName,
      },
    });
    dynamodbSyntheticStationData.grantFullAccess(lambdaFnQueryHistorical);

    // Give Bedrock Flow Access
    lambdaFnQueryHistorical.addPermission('AllowBedrockFlow', {
      principal: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceAccount: this.account
    });

    const bedrockFlowStack = new CdkBedrockFlowStack(this, `${appName}BedrockFlow`, {
      knowledgeBaseId: props.knowledgeBaseId,
      LAMBDA_QUERY_HISTORY: lambdaFnQueryHistorical.functionArn
    });

    const FLOW_ALIAS_IDENTIFIER = bedrockFlowStack.flowAlias
    const FLOW_IDENTIFIER = bedrockFlowStack.flowId

    // Create the "genai_bedrock_fn_async" Lambda function
    const lambdaFnAsync = new lambda.Function(this, 'GenAIBedrockAsyncHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambdas/bedrock_async'),
      timeout: Duration.seconds(900),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 1024,
      layers: [boto3Layer, powertoolsLayer],
      logRetention: logs.RetentionDays.FIVE_DAYS,
      environment: {
        AI_RECOMMENDATION_TABLE: dynamodbAIRecommendations.tableName,
        FLOW_ALIAS_IDENTIFIER: FLOW_ALIAS_IDENTIFIER,
        FLOW_IDENTIFIER: FLOW_IDENTIFIER,
        FUEL_PRICES_TABLE: dynamodbSyntheticStationData.tableName,
        FUEL_STATIONS_TABLE: dynamodbFuelStations.tableName,
        DYNAMODB_TABLE: dynamodbConversationsTable.tableName,
        CONVERSATION_HISTORY_BUCKET: conversationHistoryBucket.bucketName,
        WEBSOCKET_API_ENDPOINT: websocketApiEndpoint,
        REGION: this.region,
        POWERTOOLS_SERVICE_NAME: 'BEDROCK_ASYNC_SERVICE',
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        KNOWLEDGE_BASE_ID: props.knowledgeBaseId,
        DOC_DOMAIN: props.docCloudfrontDistribution,
        SELECTED_MODEL_ID: claudeModel,
      },
    });
    
    const customBedrockPolicyDocument = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: "BedrockAccess",
          effect: iam.Effect.ALLOW,
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeFlow",
            "bedrock:InvokeModelWithResponseStream",
            "bedrock:Retrieve"
          ],
          resources: [
            `arn:aws:bedrock:${this.region}:${this.account}:provisioned-model/${claudeModel}`,
            `arn:aws:bedrock:${this.region}::foundation-model/${claudeModel}`,
            `arn:aws:bedrock:${this.region}:${this.account}:provisioned-model/${novaModel}`,
            `arn:aws:bedrock:${this.region}::foundation-model/${novaModel}`,
            `arn:aws:bedrock:${this.region}:${this.account}:knowledge-base/${props.knowledgeBaseId}`,
            `${FLOW_ALIAS_IDENTIFIER}`
          ],
        }),
      ],
    });

    const customBedrockPolicy = new iam.Policy(this, 'CustomBedrockLambdaPolicy', {
      document: customBedrockPolicyDocument,
    });

    lambdaFnAsync.role?.attachInlinePolicy(customBedrockPolicy);
    lambdaFnAsync.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonAPIGatewayInvokeFullAccess')
    );
    dynamodbConversationsTable.grantReadWriteData(lambdaFnAsync);
    dynamodbAIRecommendations.grantReadWriteData(lambdaFnAsync);
    dynamodbFuelStations.grantReadWriteData(lambdaFnAsync);
    dynamodbSyntheticStationData.grantReadWriteData(lambdaFnAsync);
    conversationHistoryBucket.grantReadWrite(lambdaFnAsync);

    // Create the Lambda function to generate synthetic data
    const lambdaFnGenerateData = new lambda.Function(this, 'StationDataGenerator', {
      runtime: lambda.Runtime.PYTHON_3_12,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambdas/generate_synthetic_data'),
      timeout: Duration.seconds(900),
      architecture: lambda.Architecture.ARM_64,
      tracing: lambda.Tracing.ACTIVE,
      memorySize: 1024,
      logRetention: logs.RetentionDays.FIVE_DAYS,
      layers: [boto3Layer, powertoolsLayer],
      environment: {
        DYNAMODB_AI_RECOMMENDATIONS_TABLE_NAME: dynamodbAIRecommendations.tableName,
        DYNAMODB_PRICES_TABLE_NAME: dynamodbSyntheticStationData.tableName,
        DYNAMODB_STATIONS_TABLE_NAME: dynamodbFuelStations.tableName,
        FLOW_ALIAS: FLOW_ALIAS_IDENTIFIER,
        FLOW_IDENTIFIER: FLOW_IDENTIFIER
      },
    });
    lambdaFnGenerateData.role?.attachInlinePolicy(customBedrockPolicy);
    dynamodbAIRecommendations.grantReadWriteData(lambdaFnGenerateData);
    dynamodbFuelStations.grantReadWriteData(lambdaFnGenerateData);
    dynamodbSyntheticStationData.grantReadWriteData(lambdaFnGenerateData);

    const rule = new events.Rule(this, "DailyStationDataGenerationRule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "12" }), // Run at 12 PM
    });

    // add the Lambda function as a target for the Event Rule
    rule.addTarget(new targets.LambdaFunction(lambdaFnGenerateData));

    lambdaFnGenerateData.grantInvoke(new iam.ServicePrincipal('events.amazonaws.com'))

    // Create a Lambda integration for the "genai_bedrock_fn" Lambda
    const bedrockFnIntegration = new apigwv2_integrations.WebSocketLambdaIntegration(
      'BedrockFnIntegration',
      lambdaFnAsync
    );

    websocketApi.addRoute('$default', {
      integration: bedrockFnIntegration,
      returnResponse: true,
    });


    // build and deploy frontend code
    const execOptions: ExecSyncOptions = { stdio: 'inherit' };

    const bundle = Source.asset('../webapp', {
      bundling: {
        command: [
          'sh',
          '-c',
          'echo "Docker build not supported. Please install esbuild."',
        ],
        image: DockerImage.fromRegistry('node:lts-alpine'),
        local: {
          /* istanbul ignore next */
          tryBundle(outputDir: string) {
            execSync(
              'cd ../webapp && npm install && npm run build',
              execOptions,
            );
            fsExtra.copySync('../webapp/dist', outputDir);
            return true;
          },
        },
      },
    });

    const config = {
      project_region: this.region,
      cognito_region: this.region,
      user_pools_id: userPool.userPoolId,
      user_pools_web_client_id: userPoolClient.userPoolClientId,
      user_pools_domain: `${userPoolDomain.domain}.auth.us-east-1.amazoncognito.com`,
      websocket_url: `${websocketApiEndpoint}/ws`,
    };

    new BucketDeployment(this, 'WebsiteDeployBucket', {
      sources: [bundle, Source.jsonData('config.json', config)],
      destinationBucket: bucket,
      distribution: websiteCloudFrontDistribution,
      distributionPaths: ['/*'],
    });

    // Export CloudFormation outputs
    new cdk.CfnOutput(this, 'AWSChatBotURL', {
      value: `https://${websiteCloudFrontDistribution.domainName}`,
    });
    new cdk.CfnOutput(this, 'region', {
      value: this.region,
    });
    new cdk.CfnOutput(this, 'user_pool_id', {
      value: userPool.userPoolId,
    });
    new cdk.CfnOutput(this, 'user_pool_client_id', {
      value: userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'websocket_api_endpoint', {
      value: `${websocketApiEndpoint}/ws`,
    });
    new cdk.CfnOutput(this, 'user_pool_client_domain', {
      value: `${userPoolDomain.domain}`,
    });
  }
}

