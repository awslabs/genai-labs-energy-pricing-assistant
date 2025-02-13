import os
import boto3
import csv
import json
import io
from datetime import datetime, timedelta
from boto3.dynamodb.conditions import Key
from decimal import Decimal

# Set up the DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.environ['DYNAMODB_TABLE_NAME']
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    stationname = ""
    
    if("stationName" in event):
        stationname = event["stationName"]
    else:
        stationname = json.loads(event['node']['inputs'][0]['value'])['station']
        
    # Query station data
    try:
        response = table.query(
        KeyConditionExpression=Key('station').eq(stationname),
        ScanIndexForward=False,  
        Limit=5)
    
        items = response.get('Items')
        
        # Convert to CSV
        csv_output = io.StringIO()
        fieldnames = items[0].keys()  # Get column headers from the first item
        writer = csv.DictWriter(csv_output, fieldnames=fieldnames)
        writer.writeheader()
        for item in items:
            # Convert Decimal to float for CSV compatibility
            for key, value in item.items():
                if isinstance(value, Decimal):
                    item[key] = float(value)
                if key == 'timestamp':
                    item[key] = datetime.fromtimestamp(item[key]).strftime("%Y-%m-%d %H:%M:%S")

            writer.writerow(item)
        csv_string = csv_output.getvalue()

        return csv_string
    except Exception as e:
        print(str(e))
        return "No data available"