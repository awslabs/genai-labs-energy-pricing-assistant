// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Context } from 'aws-lambda';

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers: Record<string, string>;
}

const buildLambdaResponse = (
  context: Context,
  statusCode: number = 200,
  body: Record<string, any> = {},
  headers: Record<string, string> = { 'Content-Type': 'application/json' }
): LambdaResponse => {
  body.reqId = context.awsRequestId;
  return {
    statusCode,
    body: JSON.stringify(body),
    headers,
  };
};

const parseEventBody = (event: any): any => {
  const isJsonContentType =
    event.headers?.[`content-type`]?.match(/application\/json/i);
  if (isJsonContentType) {
    const parsedBody = JSON.parse(event.body);
    return { ...event, body: parsedBody };
  }
  return event;
};

export { buildLambdaResponse, parseEventBody };