import os
import json
from aws_lambda_powertools import Logger, Metrics, Tracer
from process_prompt import execute_agent_workflow, stream_pricing_message
from utils.websocket_util import check_websocket_status, send_websocket_message
from utils.chat_history_util import price_estimate_bedrock_flow, delete_conversation_history, load_conversation_history, query_existing_history, store_conversation_history
from utils.fuel_station_util import query_latest_fuel_prices, query_historical_fuel_prices, query_stations, query_station_detail, query_ai_recommendation

logger = Logger()
metrics = Metrics()
tracer = Tracer()
user_cache = {}

user_pool_id = os.environ['USER_POOL_ID']
user_pool_client_id = os.environ['USER_POOL_CLIENT_ID'] 
region = os.environ['REGION']

@tracer.capture_lambda_handler
def lambda_handler(event, context):
    try:
        request_body = json.loads(event['body'])
    except (ValueError, KeyError):
        # Handle the case where the request body is not valid JSON or does not contain the 'body' key
        request_body = {}
        
    id_token = request_body.get('idToken', 'none')
    
    allowed, not_allowed_message = True, ""
    if allowed:
        # Handle WebSocket message
        try:
            # Check if the event is a WebSocket event
            if event['requestContext']['eventType'] == 'MESSAGE':
                # Handle WebSocket message
                process_websocket_message(event)

            return {'statusCode': 200}
        except Exception as e:    
            logger.error("Error (766): " + str(e))
            return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
        
    else:
        return {
            'statusCode': 403,
            'body': json.dumps({'error': not_allowed_message})
        }

@tracer.capture_method
def process_websocket_message(event):
    # Extract the request body and session ID from the WebSocket event
    request_body = json.loads(event['body'])
    message_type = request_body.get('type', '')
    tracer.put_annotation(key="MessageType", value=message_type)
    session_id = request_body.get('session_id', 'XYZ')
    tracer.put_annotation(key="SessionID", value=session_id)
    connection_id = event['requestContext']['connectionId']
    tracer.put_annotation(key="ConnectionID", value=connection_id)
    id_token = request_body.get('idToken', 'none')

    # Check if the WebSocket connection is open
    if not check_websocket_status(connection_id):
        return

    if message_type == 'clear_conversation':
        logger.info(f'Action: Clear Conversation {session_id}')
        # Delete the conversation history from DynamoDB
        delete_conversation_history(session_id)
        return
    elif message_type == 'load':
        # Load conversation history from DynamoDB
        conversation_history_chunks = load_conversation_history(session_id)
        
        # Send the conversation history chunks to the WebSocket client
        for chunk in conversation_history_chunks:
            send_websocket_message(connection_id, {
                'type': 'conversation_history',
                'chunk': chunk
            })
        return
    elif message_type == 'price_estimate':
        # Trigger Bedrock Flow to estimate price
        prompt = request_body.get('prompt', '')
        price_estimate = price_estimate_bedrock_flow(session_id, prompt)
        logger.info("response: " + price_estimate["response"] )

        # Send estimate
        content = stream_pricing_message(price_estimate["response"], connection_id)

        return
    elif message_type == 'fuel_prices':
        # retrieve current fuel prices for a station
        station = request_body.get('station', '')
        logger.info("fuel_prices: " + station)
        fuel_prices = query_latest_fuel_prices(station)

        # Send fuel prices
        send_websocket_message(connection_id, {
                'type': 'current_fuel_prices',
                'prices': fuel_prices
            })
        return
    elif message_type == 'historical_fuel_prices':
        # retrieve historical fuel prices for a station
        station = request_body.get('station', '')
        logger.info("historical_fuel_prices: " + station)
        fuel_prices = query_historical_fuel_prices(station)
        logger.info("response: " + json.dumps(fuel_prices))

        # Send fuel prices
        send_websocket_message(connection_id, {
                'type': 'historical_fuel_prices',
                'prices': fuel_prices
            })
        return
    elif message_type == 'stations':
        # retrieve list of stations
        stations = query_stations()
        logger.info ("stations: "+ json.dumps(stations))

        # Send station list
        send_websocket_message(connection_id, {
                'type': 'stations',
                'stations': stations
            })
        return
    elif message_type == 'station_detail':
        # retrieve station detail
        station = request_body.get('station', '')
        station = query_station_detail(station)
        logger.info ("station: "+ json.dumps(station))

        # Send station detail
        send_websocket_message(connection_id, {
                'type': 'station_detail',
                'station': station
            })
        return
    elif message_type == 'ai_recommendation':
        # retrieve ai recommendation
        station = request_body.get('station', '')
        recommendation = query_ai_recommendation(station)

        # Send station detail
        send_websocket_message(connection_id, {
                'type': 'ai_recommendation',
                'recommendation': recommendation
            })
        return
    else:
        # Handle other message types (e.g., prompt)
        try:
            logger.info("session_id: " + session_id )
            prompt = request_body.get('prompt', '')
            logger.info("prompt: " + prompt)
            existing_history = query_existing_history(session_id)
            logger.info("hisotry: " + str(existing_history))
            assistant_response = execute_agent_workflow(existing_history, prompt, connection_id)
            logger.info("assistant_response: " + assistant_response)
            store_conversation_history(session_id, existing_history, prompt, assistant_response)
        except Exception as e:
            logger.error(str(e))
            send_websocket_message(connection_id, {
                'type': 'error',
                'error': 'Internal error. Please try later.'
            })
