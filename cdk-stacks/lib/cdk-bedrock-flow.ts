import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { bedrock as bedrockconstructs } from '@cdklabs/generative-ai-cdk-constructs';

export interface CdkBedrockFlowProps extends cdk.NestedStackProps {
  readonly knowledgeBaseId: string;
  readonly LAMBDA_QUERY_HISTORY: string;
}

export class CdkBedrockFlowStack extends cdk.NestedStack {

  public readonly flowId: string;
  public readonly flowAlias: string;

  constructor(scope: Construct, id: string, props: CdkBedrockFlowProps) {

    super(scope, id, props);

    NagSuppressions.addStackSuppressions(this, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Bedrock Execution Role requires access to multiple resources.'
      }
    ])

    const appName = 'EnergyPricingAssistant'

    const novaModel = bedrockconstructs.CrossRegionInferenceProfile.fromConfig({
      geoRegion: bedrockconstructs.CrossRegionInferenceProfileRegion.US,
      model: bedrockconstructs.BedrockFoundationModel.AMAZON_NOVA_LITE_V1,
    });

    const claudeModel = bedrockconstructs.CrossRegionInferenceProfile.fromConfig({
      geoRegion: bedrockconstructs.CrossRegionInferenceProfileRegion.US,
      model: bedrockconstructs.BedrockFoundationModel.ANTHROPIC_CLAUDE_HAIKU_V1_0,
    });

    const bedrockflowExecuteKbRole = new iam.Role(this, 'BedrockFlowRole', {
      assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
      roleName: 'EnergyPricingAssistantBedrockFlowRole',
    });

    bedrockflowExecuteKbRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.ServicePrincipal('bedrock.amazonaws.com')],
        actions: ['sts:AssumeRole'],
        conditions: {
          'StringEquals': {
            'aws:SourceAccount': this.account,
          },
          'ArnLike': {
            'aws:SourceArn': `arn:aws:bedrock:${this.region}:${this.account}:flow/*`,
          },
        },
      })
    );
    bedrockflowExecuteKbRole.addToPolicy(
      new iam.PolicyStatement({
        sid: "BedrockAccess",
        effect: iam.Effect.ALLOW,
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeFlow",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Retrieve",
          "bedrock:RetrieveAndGenerate",
          "bedrock:GetInferenceProfile",
          "lambda:InvokeFunction",
        ],
        resources: ["*"],
      })
    );



    const cfnBedrockFlow = new bedrock.CfnFlow(this, 'BedrockFlow', {
      executionRoleArn: bedrockflowExecuteKbRole.roleArn,
      name: 'energy-pricing-assistant-flow',
      description: 'A flow retrieves AI recommendations for fuel station prices',

      definition: {
        connections: [
          {
            configuration: {
              data: {
                sourceOutput: "functionResponse",
                targetInput: "historicaldata"
              }

            },
            name: "GetHistoricalDataLambdaFunctionNode0ToGetCompanyPricingEstimatePromptsNode0",
            source: "GetHistoricalData",
            target: "GetCompanyPricingEstimate",
            type: "Data"

          },
          {
            configuration: {
              data: {
                sourceOutput: "functionResponse", targetInput: "input"
              }

            },
            name: "GetHistoricalDataLambdaFunctionNode0ToGetWeatherForecastPromptsNode0",
            source: "GetHistoricalData",
            target: "GetWeatherForecast",
            type: "Data"

          },
          {
            configuration: {
              data: {
                sourceOutput: "modelCompletion", targetInput: "weather"
              }

            },
            name: "GetWeatherForecastPromptsNode0ToGetCompanyPricingEstimatePromptsNode1",
            source: "GetWeatherForecast",
            target: "GetCompanyPricingEstimate",
            type: "Data"

          },
          {
            configuration: {
              data: {
                sourceOutput: "modelCompletion", targetInput: "retrievalQuery"
              }

            },
            name: "AcquirePricingStrategyPromptsNode0ToPricingStrategyKnowledgeBaseKnowledgeBaseNode0",
            source: "AcquirePricingStrategy",
            target: "PricingStrategyKnowledgeBase",
            type: "Data"

          },
          {
            configuration: {
              data: {
                sourceOutput: "outputText", targetInput: "strategy"
              }

            },
            name: "PricingStrategyKnowledgeBaseKnowledgeBaseNode0ToGetCompanyPricingEstimatePromptsNode2",
            source: "PricingStrategyKnowledgeBase",
            target: "GetCompanyPricingEstimate",
            type: "Data"

          },
          {
            configuration: {
              data: {
                sourceOutput: "modelCompletion", targetInput: "document"
              }

            },
            name: "GetCompanyPricingEstimatePromptsNode0ToFlowOutputNodeFlowOutputNode0",
            source: "GetCompanyPricingEstimate",
            target: "FlowOutputNode",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "document", targetInput: "input" }
            },
            name: "FlowInputNodeFlowInputNode0ToExtractPromptTypePromptsNode0",
            source: "FlowInputNode",
            target: "ExtractPromptType",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "modelCompletion", targetInput: "weather" }

            },
            name: "GetWeatherForecastPromptsNode0ToGetAIRecommendationSpotlightPromptsNode1",
            source: "GetWeatherForecast",
            target: "GetAIRecommendationSpotlight",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "outputText", targetInput: "strategy" }

            },
            name: "PricingStrategyKnowledgeBaseKnowledgeBaseNode0ToGetAIRecommendationSpotlightPromptsNode2",
            source: "PricingStrategyKnowledgeBase",
            target: "GetAIRecommendationSpotlight",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "functionResponse", targetInput: "historicaldata" }

            },
            name: "GetHistoricalDataLambdaFunctionNode0ToGetAIRecommendationSpotlightPromptsNode0",
            source: "GetHistoricalData",
            target: "GetAIRecommendationSpotlight",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "modelCompletion", targetInput: "prompttype" }

            },
            name: "ExtractPromptTypePromptsNode0ToRoutePromptTypeConditionNode0",
            source: "ExtractPromptType",
            target: "RoutePromptType",
            type: "Data"

          },
          {
            configuration: {
              conditional: { condition: "GeneratePriceEstimate" }

            },
            name: "RoutePromptTypeConditionNodeHandle0ToGetCompanyPricingEstimateGetCompanyPricingEstimateHeaderHandle",
            source: "RoutePromptType",
            target: "GetCompanyPricingEstimate",
            type: "Conditional"

          },
          {
            configuration: {
              conditional: { condition: "GenerateAIRecommendation" }

            },
            name: "RoutePromptTypeConditionNodeHandle1ToGetAIRecommendationSpotlightPrompt_2HeaderHandle",
            source: "RoutePromptType",
            target: "GetAIRecommendationSpotlight",
            type: "Conditional"

          },
          {
            configuration: {
              data: { sourceOutput: "document", targetInput: "stationName" }

            },
            name: "FlowInputNodeFlowInputNode0ToGetHistoricalDataLambdaFunctionNode0",
            source: "FlowInputNode",
            target: "GetHistoricalData",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "document", targetInput: "input" }

            },
            name: "FlowInputNodeFlowInputNode0ToAcquirePricingStrategyPromptsNode0",
            source: "FlowInputNode",
            target: "AcquirePricingStrategy",
            type: "Data"

          },
          {
            configuration: {
              data: { sourceOutput: "modelCompletion", targetInput: "document" }

            },
            name: "GetAIRecommendationSpotlightPromptsNode0ToFlowOutputNode_1FlowOutputNode0",
            source: "GetAIRecommendationSpotlight",
            target: "FlowOutputNode_1",
            type: "Data"
          }
        ],
        "nodes": [
          {
            configuration: {
              "input": {}

            },
            name: "FlowInputNode",
            outputs: [{ name: "document", type: "String" }],
            type: "Input"

          },
          {
            configuration: {
              "output": {}
            },
            inputs: [{ expression: "$.data", name: "document", type: "String" }],
            name: "FlowOutputNode", type: "Output"

          },
          {
            configuration: {
              "knowledgeBase": { "knowledgeBaseId": props.knowledgeBaseId, modelId: claudeModel.inferenceProfileArn }
            },
            inputs: [{ expression: "$.data", name: "retrievalQuery", type: "String" }],
            name: "PricingStrategyKnowledgeBase",
            outputs: [{ name: "outputText", type: "String" }],
            type: "KnowledgeBase"

          },
          {
            configuration: {
              prompt: {
                sourceConfiguration: {
                  inline: {
                    inferenceConfiguration: {
                      text: { maxTokens: 2000, temperature: 0.5, topP: 0.5 }
                    },
                    modelId: novaModel.inferenceProfileArn,
                    templateConfiguration: {
                      text: {
                        inputVariables: [{ name: "historicaldata" }, { name: "weather" }, { name: "strategy" }],
                        text: "You are an AI assistant specializing in fuel station pricing forecasts. Using provided historical data (weather, traffic, sales volume, company and competitor prices) along with weather forecasts and pricing strategies, predict and justify the next day's fuel price. The latest historical price timestamp is the current date.\n\nProcess:\n1. Analyze historical data, weather forecast, and pricing strategy.\n2. Predict the fuel price to be set for today.\n3. Explain your reasoning, citing relevant data points (max 500 characters).\n4. Bold only the recommended regular fuel price using markdown: **$X.XX**\n\nHistorical Data: {{historicaldata}}\nWeather Forecast: {{weather}}\nPricing Strategy: {{strategy}}\n\nProvide a concise, data-driven response with clear reasoning for your price prediction of the current price and in bullet points if necessary. Here are examples of what the response can look like. Your response doesn't have to be exactly the same, feel free to adjust as needed. Does not need to be verbatum. Do not generate redundant reasons in bullet points.\n\n<Example 1>\nBased on the historical data, weather forecast, and pricing strategy considerations, I propose a leading strategy that will increase the current regular fuel price to **<proposed price>**\n\n- <Optional: Any other valuable insight>\n- <Optional: Any other valuable insight>\n- <Optional: Any other valuable insight>\n\n<Example 2>\nBased on the historical data, weather forecast, and pricing strategy considerations, I propose a lagging strategy that will decrease the current regular fuel price to **<proposed price>**\n\n- The forecasted weather in <city> is <weather>, which typically leads to lower fuel demand and potentially lower prices.\n- <Optional: Any other valuable insight>\n- Analyzing the pricing strategy, it is important to consider price elasticity and monitor competitor pricing. The data suggests that a small decrease in price to <proposed price> would be reasonable, as it is still within the range of recent prices and aligns with the expected <weather> conditions, which may drive lower demand.\nComparing the regular fuel prices of the competitors, Meridian Petrol and Horizon Energy, the recommended price of <proposed price> is within range of their recent regular fuel prices, which were <lower range> and <upper range>, respectively.\n\n<Example 3>\nBased on the historical data, weather forecast, and pricing strategy considerations, I do not recommend any changes as the proposed price will remain the same at **<current price>**"
                      }

                    },
                    templateType: "TEXT"

                  }

                }

              }

            },
            inputs: [
              { expression: "$.data", name: "historicaldata", type: "String" },
              { expression: "$.data", name: "weather", type: "String" },
              { expression: "$.data", name: "strategy", type: "String" }],
            name: "GetCompanyPricingEstimate",
            outputs: [{ name: "modelCompletion", type: "String" }],
            type: "Prompt"

          },
          {
            configuration: {
              lambdaFunction: { "lambdaArn": props.LAMBDA_QUERY_HISTORY }

            },
            inputs: [{ expression: "$.data", name: "stationName", type: "String" }],
            name: "GetHistoricalData",
            outputs: [{ name: "functionResponse", type: "String" }],
            type: "LambdaFunction"

          },
          {
            configuration: {
              prompt: {
                sourceConfiguration: {
                  inline: {
                    inferenceConfiguration: {
                      text: { maxTokens: 1000, temperature: 0.5, topP: 0.5 }

                    },
                    modelId: claudeModel.inferenceProfileArn,
                    templateConfiguration: {
                      text: {
                        inputVariables: [{ name: "input" }],
                        text: "Based on the input data that contains historical traffic conditions, weather events, station prices, and competitor prices, can you continue to provide weather data for the next 7 days for that city with fake data that is historically accurate? Provide this in a CSV.\n<Input Data>{{input}}"

                      }

                    },
                    templateType: "TEXT"

                  }

                }

              }

            },
            inputs: [{ expression: "$.data", name: "input", type: "String" }],
            name: "GetWeatherForecast",
            outputs: [{ name: "modelCompletion", type: "String" }],
            type: "Prompt"

          },
          {
            configuration: {
              prompt: {
                sourceConfiguration: {
                  inline: {
                    inferenceConfiguration: {
                      text: {
                        maxTokens: 2000, temperature: 0.5, topP: 0.5

                      }

                    },
                    modelId: "amazon.titan-text-premier-v1:0",
                    templateConfiguration: {
                      text: {
                        inputVariables: [{ name: "input" }],
                        text: "Create a question that I would ask a knowledge base. Here is the question I would like you to generate below:\n\n \"You are an assistant that helps analysts with pricing forecast for fuel stations. The following fuel station context is provided here {{input}}\n\nSummarize key data points in the strategy docs that would support pricing adjustments. Think through this answer and be sure to explain your thoughts.\""

                      }

                    },
                    templateType: "TEXT"
                  }
                }
              }
            },
            inputs: [
              { expression: "$.data", name: "input", type: "String" }
            ],
            name: "AcquirePricingStrategy",
            outputs: [
              { name: "modelCompletion", type: "String" }
            ],
            type: "Prompt"
          },
          {
            configuration: {
              prompt: {
                sourceConfiguration: {
                  inline: {
                    inferenceConfiguration: {
                      text: {
                        maxTokens: 1000, temperature: 0.5, topP: 0.5

                      }

                    },
                    modelId: novaModel.inferenceProfileArn,
                    templateConfiguration: {
                      text: {
                        inputVariables: [{ name: "input" }],
                        text: "You are an AI assistant that categorizes input data. Given a JSON input, you should output a single word that represents the prompt type.  Input JSON \nformat: {   \"prompttype\": \"string\",   \"station\": \"string\"} \n\n Your task is to read the \"prompttype\" value from the input and output it as a single word, without any additional text, punctuation, or explanation  \n\n Example: \nInput: { \"prompttype\": \"priceestimate\", \"station\": \"Station 1\" } \nOutput: priceestimate  \n\nNow, provide the output for the following input:\n{{input}}"

                      }

                    },
                    templateType: "TEXT"

                  }

                }

              }

            },
            inputs: [{ expression: "$.data", name: "input", type: "String" }],
            name: "ExtractPromptType",
            outputs: [{ name: "modelCompletion", type: "String" }],
            type: "Prompt"
          },
          {
            configuration: {
              condition: {
                conditions: [
                  { expression: "prompttype == \"priceestimate\"", name: "GeneratePriceEstimate" },
                  { expression: "prompttype == \"airecommendation\"", name: "GenerateAIRecommendation" },
                  { name: "default" }
                ]

              }

            },
            inputs: [{ expression: "$.data", name: "prompttype", type: "String" }],
            name: "RoutePromptType", type: "Condition"

          },
          {
            configuration: {
              prompt: {
                sourceConfiguration: {
                  inline: {
                    inferenceConfiguration: {
                      text: { maxTokens: 1000, temperature: 0.5, topP: 0.5 }
                    },
                    modelId: novaModel.inferenceProfileArn,
                    templateConfiguration: {
                      text: {
                        inputVariables: [{ name: "historicaldata" }, { name: "weather" }, { name: "strategy" }],
                        text: "You are an AI assistant specializing in fuel station pricing forecasts. Using provided historical data (weather, traffic, sales volume, company and competitor prices) along with weather forecasts and pricing strategies, provide a short 2-3 sentences advising if current prices should be adjusted for today/tomorrow.\n\nProcess:\n1. Identify the current date from the latest historical price timestamp.\n2. Analyze historical data, weather forecast, traffic data, and pricing strategy.\n3. Advise if prices should be changed in 2 to 3 short sentences.\n4. Provide a short reason and observation in what would be a headline.\n\nHistorical Data: {{historicaldata}}\nWeather Forecast: {{weather}}\nPricing Strategy: {{strategy}}\n\nProvide a concise, data-driven response with clear reasoning for your price prediction. Example outputs should be similar to the following.\nExample 1:\n**Traffic event - road closure today**\nAn accident has resulted in a road closure. I recommend fuel price adjustments at Station 1 in Amarillo, TX."
                      }

                    },
                    templateType: "TEXT"

                  }

                }

              }

            },
            inputs: [
              { expression: "$.data", name: "historicaldata", type: "String" },
              { expression: "$.data", name: "weather", type: "String" },
              { expression: "$.data", name: "strategy", type: "String" }
            ],
            name: "GetAIRecommendationSpotlight",
            outputs: [
              { name: "modelCompletion", type: "String" }
            ],
            type: "Prompt"
          },
          {
            configuration: {
              "output": {}

            },
            inputs: [{ expression: "$.data", name: "document", type: "String" }],
            name: "FlowOutputNode_1", type: "Output"

          }
        ]
      }

    });

    const cfnFlowVersion = new bedrock.CfnFlowVersion(this, 'BedrockFlowVersion', {
      flowArn: cfnBedrockFlow.attrArn
    });

    const cfnFlowAlias = new bedrock.CfnFlowAlias(this, 'BedrockFlowAlias', {
      flowArn: cfnBedrockFlow.attrArn,
      name: 'latest',
      routingConfiguration: [{
        flowVersion: cfnFlowVersion.attrVersion,
      }]
    });

    this.flowId = cfnBedrockFlow.attrId;
    this.flowAlias = cfnFlowAlias.attrArn;

    // Export CloudFormation outputs
    new cdk.CfnOutput(this, 'FlowID', {
      value: cfnBedrockFlow.attrId
    });
    new cdk.CfnOutput(this, 'FlowAliasARN', {
      value: cfnFlowAlias.attrArn
    });
  }
}

