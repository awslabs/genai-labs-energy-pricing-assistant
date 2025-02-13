import os
import boto3
import json
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Metrics, Tracer

logger = Logger()
metrics = Metrics()
tracer = Tracer()

WEBSOCKET_API_ENDPOINT = os.environ['WEBSOCKET_API_ENDPOINT']
apigateway_management_api = boto3.client('apigatewaymanagementapi', endpoint_url=f"{WEBSOCKET_API_ENDPOINT.replace('wss', 'https')}/ws")


@tracer.capture_method
def send_websocket_message(connection_id, message):
    """Send message through websocket connection back to client

    Args:
        connection_id (str): client connection ID
        message (str): message to send to client
            
    """
    try:
        # Check if the WebSocket connection is open
        connection = apigateway_management_api.get_connection(ConnectionId=connection_id)
        connection_state = connection.get('ConnectionStatus', 'OPEN')
        if connection_state != 'OPEN':
            logger.warn(f"WebSocket connection is not open (state: {connection_state})")
            return

        apigateway_management_api.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(message).encode()
        )
    except apigateway_management_api.exceptions.GoneException:
        logger.info(f"WebSocket connection is closed (connectionId: {connection_id})")
    except Exception as e:
        logger.error(f"Error sending WebSocket message (9012): {str(e)}")

def check_websocket_status(connection_id):
    try:
        connection = apigateway_management_api.get_connection(ConnectionId=connection_id)
        connection_state = connection.get('ConnectionStatus', 'OPEN')
        return connection_state == 'OPEN'
    except ClientError as e:
        logger.error(f"Error checking WebSocket status (9011): {str(e)}")
        return False