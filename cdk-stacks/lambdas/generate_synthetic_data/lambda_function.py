import os
import json
from fuel_station_prices import generate_fuel_prices, generate_ai_recommendations
from fuel_stations import create_stations


def lambda_handler(event, context):
    create_stations(event, context)
    generate_ai_recommendations()
    return generate_fuel_prices()