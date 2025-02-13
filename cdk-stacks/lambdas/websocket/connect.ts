import { APIGatewayProxyEvent } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent) => {
    console.log('Connect event', event);
    return {
        statusCode: 200,
        body: 'Connected'
    };
};