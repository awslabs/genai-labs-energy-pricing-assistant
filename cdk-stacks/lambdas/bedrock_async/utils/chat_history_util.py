from datetime import datetime
import os
import json
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Metrics, Tracer

logger = Logger()
metrics = Metrics()
tracer = Tracer()
user_cache = {}

# Initialize DynamoDB and S3 client
dynamodb = boto3.client('dynamodb')
s3 = boto3.client('s3')

conversation_history_bucket = os.environ['CONVERSATION_HISTORY_BUCKET']
table_name = os.environ['DYNAMODB_TABLE']
flowAliasIdentifier = os.environ["FLOW_ALIAS_IDENTIFIER"]
flowIdentifier = os.environ["FLOW_IDENTIFIER"]

client_runtime = boto3.client('bedrock-agent-runtime')

@tracer.capture_method
def price_estimate_bedrock_flow(session_id, prompt):
    """Triggers a Bedrock flow to acquire pricing suggestion

    Args:
        session_id (str): client session ID
        prompt (str): Prompt in JSON format to be passed to Bedrock Flow

    Returns:
        dict: price estimate response
    """
    response = client_runtime.invoke_flow(
        flowAliasIdentifier=flowAliasIdentifier,
        flowIdentifier=flowIdentifier,
        inputs=[
            {
                'content': {
                    'document': prompt
                },
                'nodeName': 'FlowInputNode',
                'nodeOutputName': 'document'
            },
        ]
    )
    
    result = {}
    
    for event in response.get("responseStream"):
        result.update(event)
    
    if result['flowCompletionEvent']['completionReason'] == 'SUCCESS':
        logger.info("Bedrock flow invocation was successful! The output of the Bedrock flow is as follows:\n")
        logger.info(result['flowOutputEvent']['content']['document'])
    
    else:
        logger.info("The bedrock flow invocation completed because of the following reason:", result['flowCompletionEvent']['completionReason'])
    
    return {
        'response': result['flowOutputEvent']['content']['document']
    }

@tracer.capture_method
def delete_conversation_history(session_id):
    """Clears conversation history for the session id

    Args:
        session_id (str): Client session ID    
    """
    try:
        dynamodb.delete_item(
            TableName=table_name,
            Key={'session_id': {'S': session_id}}
        )
        logger.info(f"Conversation history deleted for session ID: {session_id}")
    except Exception as e:
        logger.error(f"Error deleting conversation history (9781): {str(e)}")

@tracer.capture_method
def query_existing_history(session_id):
    """Return existing conversation history for client session

    Args:
        session_id (str): client session ID
        
    Returns:
        dict: list of messages
    """
    try:
        response = dynamodb.get_item(
            TableName=table_name,
            Key={'session_id': {'S': session_id}},
            ProjectionExpression='conversation_history'
        )

        if 'Item' in response:
            return json.loads(response['Item']['conversation_history']['S'])
        else:
            return []

    except Exception as e:
        logger.error("Error querying existing history: " + str(e))
        return []

@tracer.capture_method
def store_conversation_history(session_id, existing_history, user_message, assistant_message):
    """Store message in dynamo db conversation history

    Args:
        session_id (str): Websocket session ID
        existing_history (dict): current history of messages
        user_message (str): message to store
        assistant_message (str): Message from AI assistant

    """
    if user_message.strip() and assistant_message.strip():
        # Prepare the updated conversation history
        conversation_history = existing_history + [
            {'role': 'user', 'content': [{'text': user_message}]},
            {'role': 'assistant', 'content': [{'text': assistant_message}]}
        ]
        conversation_history_size = len(json.dumps(conversation_history).encode('utf-8'))


        # Check if the conversation history size is greater than 80% of the 400KB limit (327,680)
        if conversation_history_size > (400 * 1024 * 0.8):
            logger.warn(f"Warning: Session ID {session_id} has reached 80% of the DynamoDB limit. Storing conversation history in S3.")
            # Store the conversation history in S3
            try:
                s3.put_object(
                    Bucket=conversation_history_bucket,
                    Key=f"{session_id}.json",
                    Body=json.dumps(conversation_history).encode('utf-8')
                )
            except ClientError as e:
                logger.error(f"Error storing conversation history in S3: {e}")

            # Update the DynamoDB item to indicate that the conversation history is in S3
                dynamodb.update_item(
                    TableName=table_name,
                    Key={'session_id': session_id},
                    UpdateExpression="SET conversation_history_in_s3=:true",
                    ExpressionAttributeValues={':true': True}
                )
        else:
            # Store the updated conversation history in DynamoDB
            dynamodb.put_item(
                TableName=table_name,
                Item={
                    'session_id': {'S': session_id},
                    'conversation_history': {'S': json.dumps(conversation_history)},
                    'conversation_history_in_s3': {'BOOL': False}
                }
            )
        
    else:
        if not user_message.strip():
            logger.info(f"User message is empty, skipping storage for session ID: {session_id}")
        if not assistant_message.strip():
            logger.info(f"Assistant response is empty, skipping storage for session ID: {session_id}")

@tracer.capture_method
def load_conversation_history(session_id):
    """Return conversation history from s3

    Args:
        session_id (str): client session ID
        
    Returns:
        dict: list of messages
    """
    try:
        response = dynamodb.get_item(
            TableName=table_name,
            Key={'session_id': {'S': session_id}}
        )

        if 'Item' in response:
            item = response['Item']
            conversation_history_in_s3 = False
            conversation_history_in_s3_value = item.get('conversation_history_in_s3', False)
            if isinstance(conversation_history_in_s3_value, dict):
                conversation_history_in_s3 = conversation_history_in_s3_value.get('BOOL', False)

            if conversation_history_in_s3:
                # Load conversation history from S3
                response = s3.get_object(Bucket=conversation_history_bucket, Key=f"{session_id}.json")
                conversation_history = json.loads(response['Body'].read().decode('utf-8'))
            else:
                # Load conversation history from DynamoDB
                conversation_history_str = item['conversation_history']['S']
                conversation_history = json.loads(conversation_history_str)

            # Split the conversation history into chunks
            return split_message(conversation_history)


        else:
            return []

    except Exception as e:
        logger.error(f"Error loading conversation history: {str(e)}")
        return []
    

@tracer.capture_method
def split_message(message, max_chunk_size=30 * 1024):  # 30 KB chunk size
    """Break message into chucks

    Args:
        message (str): message to chunk
        
    Returns:
        dict: chunks of original message
    """
    chunks = []
    current_chunk = []
    current_chunk_size = 0

    for msg in message:
        msg_json = json.dumps({'role': msg['role'], 'content': msg['content']})
        msg_size = len(msg_json.encode('utf-8'))

        if current_chunk_size + msg_size > max_chunk_size:
            chunks.append(json.dumps(current_chunk))
            current_chunk = []
            current_chunk_size = 0

        current_chunk.append(msg)
        current_chunk_size += msg_size

    if current_chunk:
        chunks.append(json.dumps(current_chunk))

    return chunks