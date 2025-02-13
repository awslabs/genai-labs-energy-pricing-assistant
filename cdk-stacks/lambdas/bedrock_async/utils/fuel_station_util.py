from datetime import datetime
import os
import boto3
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Metrics, Tracer
from boto3.dynamodb.conditions import Key
from decimal import Decimal

logger = Logger()
metrics = Metrics()
tracer = Tracer()


# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Initialize dynamodb tables
table_name = os.environ['FUEL_PRICES_TABLE']
stations_table_name = os.environ['FUEL_STATIONS_TABLE']
ai_recommendation_table_name = os.environ['AI_RECOMMENDATION_TABLE']

fuel_prices_table = dynamodb.Table(table_name)
fuel_stations_table = dynamodb.Table(stations_table_name)
ai_recommendation_table = dynamodb.Table(ai_recommendation_table_name)


@tracer.capture_method
def query_stations():
    """Return list of fuel stations from dynamodb

    Returns:
        dict: list of stations
    """
    try:
        response = fuel_stations_table.scan(
            Limit=50
        ) 

        unsorted_items = response.get('Items')
        items = sorted(unsorted_items, key=lambda x: x['id'])

        formated_items = []
        
        for item in items:
            current_item = item
            
            # Convert Decimal to float for CSV compatibility
            for key, value in current_item.items():
                if isinstance(value, Decimal):
                    current_item[key] = float(value)
                if key == 'timestamp':
                    current_item[key] = datetime.fromtimestamp(current_item[key]).strftime("%Y-%m-%d %H:%M:%S")
            
            formated_items.append(current_item)
        return formated_items
    except:
        return []

@tracer.capture_method
def query_station_detail(station_name):
    """Queries DynamoDB for detail of a specific station.

    Args:
        station_name (str): The name of the station to query.

    Returns:
        dict or None: Station Details
    """
    try:

        # Query with KeyConditionExpression to filter by station
        response = fuel_stations_table.query(
            KeyConditionExpression=Key('station').eq(station_name),
            ScanIndexForward=False,   # Sort by timestamp in descending order (newest first)
            Limit=1                     # Retrieve only the latest (top) record
        )
        
        items = response.get('Items')
        if items:
            latest_item = items[0]
            
            # Convert Decimal to float for CSV compatibility
            for key, value in latest_item.items():
                if isinstance(value, Decimal):
                    latest_item[key] = float(value)
                if key == 'timestamp':
                    latest_item[key] = datetime.fromtimestamp(latest_item[key]).strftime("%Y-%m-%d %H:%M:%S")

            return latest_item
        else:
            return None

    except Exception as e:
        print(f"Error querying latest fuel prices: {e}")
        return None  # Indicate that no data was found

@tracer.capture_method
def query_ai_recommendation(station_name):
    """Queries DynamoDB for the latest ai recommendation at a specific station.

    Args:
        station_name (str): The name of the station to query.

    Returns:
        dict or None: Recommendation by AI.
    """
    try:

        # Query with KeyConditionExpression to filter by station
        response = ai_recommendation_table.query(
            KeyConditionExpression=Key('station').eq(station_name),
            ScanIndexForward=False,   # Sort by timestamp in descending order (newest first)
            Limit=1                     # Retrieve only the latest (top) record
        )
        
        items = response.get('Items')
        if items:
            latest_item = items[0]
            
            # Convert Decimal to float for CSV compatibility
            for key, value in latest_item.items():
                if isinstance(value, Decimal):
                    latest_item[key] = float(value)
                if key == 'timestamp':
                    latest_item[key] = datetime.fromtimestamp(latest_item[key]).strftime("%Y-%m-%d %H:%M:%S")

            return latest_item
        else:
            return None

    except Exception as e:
        print(f"Error querying latest fuel prices: {e}")
        return None  # Indicate that no data was found
        
@tracer.capture_method
def query_latest_fuel_prices(station_name):
    """Queries DynamoDB for the latest fuel prices of a specific station.

    Args:
        station_name (str): The name of the station to query.

    Returns:
        dict or None: The latest fuel prices if found, or None if not found.
    """
    try:

        # Query with KeyConditionExpression to filter by station
        response = fuel_prices_table.query(
            KeyConditionExpression=Key('station').eq(station_name),
            ScanIndexForward=False,   # Sort by timestamp in descending order (newest first)
            Limit=1                     # Retrieve only the latest (top) record
        )
        
        items = response.get('Items')
        if items:
            latest_item = items[0]
            
            # Convert Decimal to float for CSV compatibility
            for key, value in latest_item.items():
                if isinstance(value, Decimal):
                    latest_item[key] = float(value)
                if key == 'timestamp':
                    latest_item[key] = datetime.fromtimestamp(latest_item[key]).strftime("%Y-%m-%d %H:%M:%S")

            return latest_item
        else:
            return None

    except Exception as e:
        print(f"Error querying latest fuel prices: {e}")
        return None  # Indicate that no data was found
        
@tracer.capture_method
def query_historical_fuel_prices(station_name):
    """Queries DynamoDB for 7 days history of fuel prices for a specific station.

    Args:
        station_name (str): The name of the station to query.

    Returns:
        dict or None: The latest fuel prices if found, or None if not found.
    """
    try:

        # Query with KeyConditionExpression to filter by station
        response = fuel_prices_table.query(
            KeyConditionExpression=Key('station').eq(station_name),
            ScanIndexForward=False,   # Sort by timestamp in descending order (newest first)
            Limit=7                     # Retrieve only the latest (top) record
        )
        
        items = response.get('Items')
        formated_items = []
        
        for item in items:
            current_item = item
            
            # Convert Decimal to float for CSV compatibility
            for key, value in current_item.items():
                if isinstance(value, Decimal):
                    current_item[key] = float(value)
                if key == 'timestamp':
                    current_item[key] = datetime.fromtimestamp(current_item[key]).strftime("%Y-%m-%d %H:%M:%S")
            
            formated_items.append(current_item)
        return formated_items

    except Exception as e:
        print(f"Error querying latest fuel prices: {e}")
        return None  # Indicate that no data was found