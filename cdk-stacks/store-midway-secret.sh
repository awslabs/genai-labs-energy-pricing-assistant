#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
SECRET_NAME="genai-labs-energy-pricing-assistant-ImportedSecret"
KEY_NAME="clientSecret"

echo -e "${YELLOW}Checking if secret exists...${NC}"

# Check if secret exists
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" >/dev/null 2>&1; then
    echo -e "${YELLOW}Secret already exists. Do you want to create a new version? (y/n)${NC}"
    read -r response
    SECRET_EXISTS=true
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Operation cancelled.${NC}"
        exit 0
    fi
else
    echo -e "${YELLOW}Secret does not exist. Will create new secret.${NC}"
    SECRET_EXISTS=false
fi

# Direct prompt for secret value
echo -e "\n${YELLOW}Please enter the client secret value from Midway:${NC}"
read -s SECRET_VALUE
echo  # New line after input

# Create JSON structure
echo -e "${YELLOW}Creating JSON structure...${NC}"
SECRET_JSON=$(echo -n "{\"$KEY_NAME\": \"$SECRET_VALUE\"}")

if [ "$SECRET_EXISTS" = true ]; then
    # Update existing secret
    echo -e "${YELLOW}Updating secret...${NC}"
    aws secretsmanager put-secret-value \
        --secret-id "$SECRET_NAME" \
        --secret-string "$SECRET_JSON"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Secret updated successfully!${NC}"
    else
        echo -e "${RED}Failed to update secret.${NC}"
        exit 1
    fi
else
    # Create new secret
    echo -e "${YELLOW}Creating new secret...${NC}"
    aws secretsmanager create-secret \
        --name "$SECRET_NAME" \
        --secret-string "$SECRET_JSON"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Secret created successfully!${NC}"
    else
        echo -e "${RED}Failed to create secret.${NC}"
        exit 1
    fi
fi

# Clear sensitive data
SECRET_VALUE=""
SECRET_JSON=""
