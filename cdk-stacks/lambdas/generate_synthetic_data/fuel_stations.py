import os
import json
import boto3
from datetime import datetime
from botocore.exceptions import ClientError
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Set up the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['DYNAMODB_STATIONS_TABLE_NAME']
table = dynamodb.Table(table_name)

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
        
def table_contains_records():
    try:
        response = table.scan(Limit=1)  # Fetch only one item to check
        return 'Items' in response and len(response['Items']) > 0
    except:
        return false

def put_item(item_data):
    """Inserts a JSON item into a DynamoDB table, converting floats to Decimal.

    Args:
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
        except ValueError:
            print(f"Error: Invalid timestamp format. Please use 'YYYY-MM-DDTHH:MM:SS'.")
            return None  # Indicate error

    response = table.put_item(Item=item_data)
    return response

def create_stations(event, context):
    # If table is empty, create stations using json
    if(table_contains_records() is False):
        stations = load_json_from_file("stations.json")
        
        id = 1
        for station in stations:
            station["id"] = id
            put_item(station)
            id=id+1
            
    else:
        return {
            'statusCode': 200,
            'body': "No data needs to be generated"
        }