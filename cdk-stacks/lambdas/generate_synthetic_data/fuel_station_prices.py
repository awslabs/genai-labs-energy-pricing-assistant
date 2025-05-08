import os
import json
from datetime import datetime, timedelta
from decimal import Decimal
import time
import os
import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key
import strip_markdown

# Set up the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['DYNAMODB_PRICES_TABLE_NAME']
table = dynamodb.Table(table_name)

ai_table_name = os.environ['DYNAMODB_AI_RECOMMENDATIONS_TABLE_NAME']
ai_table = dynamodb.Table(ai_table_name)

def load_json_from_file(file_path):
    try:
        with open(file_path, 'r') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        print(f"Error: File not found at '{file_path}'")
        return None
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        return None
        
def get_last_record_timestamp(stationName):
    # Query with reverse order (to get the latest first) and limit of 1
    try:
        response = table.query(
        KeyConditionExpression=Key('station').eq(stationName),
        ScanIndexForward=False,  
        Limit=1)

        items = response.get('Items')
        return items[0]["timestamp"] if items else None  # Return the first (latest) item or None
    except:
        return None
        
def get_last_record(stationName):
    # Query with reverse order (to get the latest first) and limit of 1
    try:
        response = table.query(
        KeyConditionExpression=Key('station').eq(stationName),
        ScanIndexForward=False,  
        Limit=1)

        items = response.get('Items')
        return items[0]["timestamp"] if items else None  # Return the first (latest) item or None
    except:
        return None

def put_item(dynamo_table, item_data):
    """Inserts a JSON item into a DynamoDB table, converting floats to Decimal.

    Args:
        table_name (str): The name of the DynamoDB table.
        item_data (dict): The JSON item data as a dictionary.
    """
    
    # Convert floats to Decimal
    for key, value in item_data.items():
        if isinstance(value, float):
            item_data[key] = Decimal(str(value))
    
    # Convert timestamp string to epoch
    if 'timestamp' in item_data and isinstance(item_data['timestamp'], str):
        try:
            # Parse the timestamp string with appropriate format
            datetime_obj = datetime.strptime(item_data['timestamp'], "%Y-%m-%dT%H:%M:%S")
            # Get the epoch timestamp (seconds since Unix epoch)
            item_data['timestamp'] = int(datetime_obj.timestamp())
            expiration_datetime = datetime_obj + timedelta(days=30)
            item_data['expirationtime'] = int(expiration_datetime.timestamp())
        except ValueError:
            print(f"Error: Invalid timestamp format. Please use 'YYYY-MM-DDTHH:MM:SS'.")
            return None  # Indicate error

    response = dynamo_table.put_item(Item=item_data)
    return response

def generate_fuel_prices():
    # Use the native inference API to send a text message to Anthropic Claude.
    # Create a Bedrock Runtime client in the AWS Region of your choice.
    client = boto3.client("bedrock-runtime")

    # Set the model ID, e.g., Claude 3 Haiku.
    model_id = os.environ['MODEL_ID']
    
    stations = load_json_from_file("stations.json")
        
    for station in stations:
        
        now = datetime.now()
        rounded_datetime = now.replace(minute=0, second=0, microsecond=0)
        # Convert the rounded datetime to a formatted string
        formatted_datetime = rounded_datetime.strftime('%B %d, %Y')
        
        # Get the last record timestamp from DynamoDB
        last_record_timestamp = get_last_record_timestamp(station["station"])
        days_to_create = 0
        
        if last_record_timestamp:
            # Calculate the number of days to create based on the last record timestamp
            last_record_date = datetime.fromtimestamp(int(last_record_timestamp))
            days_to_create = (datetime.now() - last_record_date).days
            if days_to_create > 5:
                days_to_create = 5
            print(f"Generating {days_to_create} days of historical data.")
        else:
            # No previous records, so create data for the last 5 days
            days_to_create = 5
            print("No previous records found, generating 5 days of historical data.")
        
        if(days_to_create > 0):
            # Define the prompt for the model.
            prompt = "Can you generate data for a gas station called {station} with this location {city}? The data needs to include traffic events, weather conditions, regular fuel price, mid fuel price, premium fuel price, and volume of gas sold at this gas station for today to the last {days} days? We also need competing prices at gas stations nearby. The gas station names are (ZenithFuel, HorizonEnergy, and MeridianPetrol). Make sure you consider real historical data for this city when making the synthetic data. Traffic conditions should correlate with weather and also be reflected in prices. For example, more road closures or accident with bad weather may require increasing prices. Provide this data in json format. The current date is {date}. Needs to be a record once a day. Only a json response is allowed, no other text that would make it invalid".format(station=station["station"], city=station["city"] ,days=days_to_create, date=formatted_datetime)
            prompt = prompt + """
                        Format:
                        
                        {"stationData": [
                            {
                            "station": "Station 1",
                            "city": "Houston",
                            "state": "TX",
                            "timestamp": "2024-07-24T12:00:00",
                            "trafficEvents": "No major events",
                            "weatherCondition": "Clear",
                            "regularFuelPrice": 3.45,
                            "midFuelPrice": 3.59,
                            "premiumFuelPrice": 3.75,
                            "volumeOfGasSold": 5200,
                            "ZenithFuelRegularFuelPrice": 3.42,
                            "ZenithFuelMidFuelPrice": 3.58,
                            "ZenithFuelPremiumFuelPrice": 3.74,
                            "HorizonEnergyRegularFuelPrice": 3.46,
                            "HorizonEnergyMidFuelPrice": 3.61,
                            "HorizonEnergyPremiumFuelPrice": 3.77,
                            "MeridianPetrolRegularFuelPrice": 3.40,
                            "MeridianPetrolMidFuelPrice": 3.55,
                            "MeridianPetrolPremiumFuelPrice": 3.72
                            },
                            {
                            "station": "Station 1",
                            "city": "Houston",
                            "state": "TX",
                            "timestamp": "2024-07-25T12:00:00",
                            "trafficEvents": "Accident on I-45 causing delays",
                            "weatherCondition": "Thunderstorms",
                            "regularFuelPrice": 3.75,
                            "midFuelPrice": 3.89,
                            "premiumFuelPrice": 4.15,
                            "volumeOfGasSold": 3800,
                            "ZenithFuelRegularFuelPrice": 3.72,
                            "ZenithFuelMidFuelPrice": 3.87,
                            "ZenithFuelPremiumFuelPrice": 4.00,
                            "HorizonEnergyRegularFuelPrice": 3.72,
                            "HorizonEnergyMidFuelPrice": 3.87,
                            "HorizonEnergyPremiumFuelPrice": 4.00,
                            "MeridianPetrolRegularFuelPrice": 3.72,
                            "MeridianPetrolMidFuelPrice": 3.87,
                            "MeridianPetrolPremiumFuelPrice": 4.00
                            },    
                          ]
                        }"""

            # Format the request payload using the model's native structure.
            native_request = {
                "system": [
                    {"text": "You create synthetic data in JSON for gas stations. Must be in JSON format as show in example. Output only plain text. Do not output markdown."}
                ],
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ],
                "inferenceConfig": {
                    "max_new_tokens": 4096,
                    "top_p": 0.9,
                    "top_k": 20,
                    "temperature": 0.5,
                }
            }
            
            # Convert the native request to JSON.
            request = json.dumps(native_request)
            
            try:
                # Invoke the model with the request.
                response = client.invoke_model(modelId=model_id, body=request)
        
            except (ClientError, Exception) as e:
                print(f"ERROR: Can't invoke '{model_id}'. Reason: {e}")
                exit(1)
            
            # Decode the response body.
            model_response = json.loads(response["body"].read())
            # Extract and print the response text.
            response_md = model_response["output"]["message"]["content"][0]["text"]
            response_text = strip_markdown.strip_markdown(response_md)

            response_text = response_text.replace("json","")
            
            generated_response = json.loads(response_text)
    
            for record in generated_response['stationData']:
                put_item(table, record)
    else:
        return {
            'statusCode': 200,
            'body': "No data needs to be generated"
        }


def generate_ai_recommendations():
    client_runtime = boto3.client('bedrock-agent-runtime')
    
    stations = load_json_from_file("stations.json")
        
    for station in stations:
        try:
            station["station"]

            response = client_runtime.invoke_flow(
                flowAliasIdentifier=os.environ["FLOW_ALIAS"],
                flowIdentifier=os.environ["FLOW_IDENTIFIER"],
                inputs=[
                    {
                        'content': {
                            'document': '{"prompttype": "airecommendation", "station": "'+station["station"]+'"}'
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
                now = datetime.now()
                rounded_datetime = now.replace(minute=0, second=0, microsecond=0)
                # Convert the rounded datetime to a formatted string
                timestamp = int(rounded_datetime.timestamp())
                expiration_datetime = int((rounded_datetime + timedelta(days=30)).timestamp())
                record = {
                    "station": station["station"],
                    "timestamp": timestamp,
                    "expirationtime": expiration_datetime,
                    "message": result['flowOutputEvent']['content']['document']
                }
                
                ## Store AI Recommendation in Dynamo DB
                put_item(ai_table, record)
            
            else:
                print("The prompt flow invocation completed because of the following reason:", result['flowCompletionEvent']['completionReason'])
            
            time.sleep(10)
        except:
            print("Error while generating AI Recommendations for: " + station["station"] + ". Waiting 30 seconds due to throttling.")
            time.sleep(30)
