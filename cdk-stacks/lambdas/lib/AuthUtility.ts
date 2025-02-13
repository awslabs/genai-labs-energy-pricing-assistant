// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { APIGatewayEvent } from 'aws-lambda';

const getUserFromJWT = async (cognitoIdToken: string) => {
    const tokenSections = cognitoIdToken.split('.');
    if (tokenSections.length < 2) {
        throw new Error('Requested token is invalid');
    }
    const payloadJSON = Buffer.from(tokenSections[1], 'base64').toString('utf8');
    const payload = JSON.parse(payloadJSON);

    return {
        username: payload['cognito:username'],
        cognito_groups: payload['cognito:groups'],
        email: payload['email'],
    }
}

export const getCurrentUser = async (req: APIGatewayEvent) => {
    return await getUserFromJWT(req.headers.authorization ?? '');
}