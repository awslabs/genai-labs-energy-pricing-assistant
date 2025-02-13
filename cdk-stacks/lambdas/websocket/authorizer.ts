// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { APIGatewayRequestAuthorizerEvent } from 'aws-lambda';
import { CognitoJwtVerifier } from "aws-jwt-verify";

const UserPoolId = process.env.USER_POOL_ID!;
const AppClientId = process.env.USER_POOL_CLIENT_ID!;

export const handler = async (event: APIGatewayRequestAuthorizerEvent): Promise<any> => {

  try {
    const verifier = CognitoJwtVerifier.create({
      userPoolId: UserPoolId,
      tokenUse: "id",
      clientId: AppClientId,
    });

    const encodedToken = event.queryStringParameters!.idToken!;
    const payload = await verifier.verify(encodedToken);

    return allowPolicy(event.methodArn, payload);
  } catch (error: any) {
    console.error(error.message);
    return denyAllPolicy();
  }
};

const denyAllPolicy = () => {
  return {
      principalId: '*',
      policyDocument: {
          Version: '2012-10-17',
          Statement: [
              {
                  Action: '*',
                  Effect: 'Deny',
                  Resource: '*'
              }
          ]
      }
  };
};

const allowPolicy = (methodArn: string, idToken: any) => {
  return {
    principalId: idToken.sub,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Allow",
          Resource: methodArn,
        },
      ],
    },
    context: {
      // set userId in the context
      userId: idToken.sub,
    },
  };
};