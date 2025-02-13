// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import Header from '@cloudscape-design/components/header';
import { useEffect, useState } from 'react';
import { Link, KeyValuePairs, ColumnLayout, Box } from '@cloudscape-design/components';
import TextContent from "@cloudscape-design/components/text-content";
import Grid from "@cloudscape-design/components/grid";
import {Icon} from '@cloudscape-design/components';
import { Container } from '@cloudscape-design/components';
import LoadingBar from "@cloudscape-design/chat-components/loading-bar";
import useWebSocket from 'react-use-websocket';
import { getCurrentUser} from 'aws-amplify/auth';

export type StationOverviewProps = {
  wsUrl: string,
  idToken: string,
  station: string
}

export type CurrentFuelPricesProps = {
  'prices': {
    'timestamp': any,
    'midFuelPrice': any,
    'premiumFuelPrice': any,
    'regularFuelPrice': any,
    'HorizonEnergyRegularFuelPrice': any,
    'HorizonEnergyMidFuelPrice': any,
    'HorizonEnergyPremiumFuelPrice': any,
    'MeridianPetrolRegularFuelPrice': any,
    'MeridianPetrolMidFuelPrice': any,
    'MeridianPetrolPremiumFuelPrice': any,
    'ZenithFuelRegularFuelPrice': any,
    'ZenithFuelMidFuelPrice': any,
    'ZenithFuelPremiumFuelPrice': any,
    'volumeOfGasSold': any,
    'weatherCondition': any
  }
}

export default function StationOverviewWidget(props: StationOverviewProps) {  
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;  // const chatHistoryRef = useRef(null);
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const stationId = props.station ? props.station : ""
  const [currentFuelPrices, setCurrentFuelPrices] = useState<CurrentFuelPricesProps>();
  const [showProgressBar, setShowProgressBar] = useState(true);

  const { sendMessage, lastMessage } = useWebSocket(wsUrl, {
    shouldReconnect: () => true, // Automatically reconnect on close
    reconnectInterval: 3000, // Reconnect every 3 seconds
  });

  const generateSessionId = async () => {
    const user = await getCurrentUser();
    const sessionId = user.username + '-' + Math.random().toString(36).substring(2, 8);
    setBedrockSessionId(sessionId);
    localStorage.setItem('bedrockSessionId', sessionId);
  };

  /**
   * Updates the current fuel prices state based on a provided message object.
   * 
   * This function checks if the message object exists and has a valid `regularFuelPrice` property. 
   * If both conditions are met, the `setCurrentFuelPrices` function is called to update the state with the new fuel prices from the message.
   *
   * @param {CurrentFuelPricesProps} message - An object containing the latest fuel prices.
   * @param {number} message.regularFuelPrice - The price of regular fuel (required).
   * // Additional properties (optional):
   * // @param {number} [message.midFuelPrice] - The price of mid-grade fuel.
   * // @param {number} [message.premiumFuelPrice] - The price of premium fuel. 
   */
  const updateFuelPrices = (message: CurrentFuelPricesProps) => {
    //console.log('message:', message)
    if (message && message.prices && message.prices.regularFuelPrice) {
      setCurrentFuelPrices(message);
      setShowProgressBar(false);
    }
    else if(message && message.prices == null)
      setShowProgressBar(false);
  };

  /**
   * Handles updates to the `lastMessage` state variable.
   *
   * - Parses the message data from `lastMessage`.
   * - If the message type is `content_block_delta` or `message_stop`, updates the message using the `updateMessage` function.
   *
   * @param {Object} lastMessage - The last message received, potentially containing data in JSON format.
   * @param {Function} sendMessage - The function used to send a message (this dependency is likely for handling responses).
   * @returns {void} - This effect function does not return a value.
   */
  useEffect(() => {
    if (currentFuelPrices == null && lastMessage !== null && lastMessage.data.length > 0) {
      const message = JSON.parse(lastMessage.data);
        if (message.type === 'current_fuel_prices') {
          updateFuelPrices(message);
        }
    }
  }, [lastMessage, sendMessage]);

  /**
   * Manages the progress bar visibility and handles pricing estimation based on message updates.
   *
   * This effect performs the following actions:
   *
   * 1. Checks if `showProgressBar` is true. If not, it does nothing.
   * 2. Retrieves the `bedrockSessionId` from local storage, or generates a new one if not found.
   * 3. If the `lastMessage` exists and has data:
   *    - Hides the progress bar (`setShowProgressBar(false)`).
   * 4. Otherwise, if a valid `storedBedrockSessionId` exists:
   *    - Calls the `onGetPricingEstimate` function with the session ID and a request message.
   *
   * @param {Object} lastMessage - The last message received.
   * @param {Function} sendMessage - The function used to send a message.
   * @param {boolean} showProgressBar - Flag indicating whether the progress bar should be shown.
   * @returns {void} - This effect function does not return a value.
   */
  useEffect(() => {
    const storedBedrockSessionId = localStorage.getItem('bedrockSessionId');

    if (!storedBedrockSessionId) {
      generateSessionId();
    }

    if (lastMessage == null || lastMessage.data.length == 0) {
      if(currentFuelPrices == null && storedBedrockSessionId) {
        onGetStationFuelPrices(storedBedrockSessionId, stationId)
      }
    }
  }, [lastMessage, sendMessage]);

  /**
   * Sends a message to request current fuel prices.
   *
   * This function constructs a message object with the type 'fuel_prices', the provided prompt, and the session ID. 
   * It then serializes the message object to JSON and calls the `sendMessage` function to send the request.
   *
   * @async
   * @param {string} sessionId - The ID of the session.
   * @param {string} station - The station id to get fuel prices for.
   * @returns {Promise<void>} - A Promise that resolves when the message has been sent.
   */
  const onGetStationFuelPrices = async (sessionId: string, message: string) => {
    const data = {
      type: 'fuel_prices',
      station: message,
      session_id: sessionId,
    }
    sendMessage(JSON.stringify(data));
  };
  
  return (
    <Container
          header={<Header variant="h2" description={"Viewing fuel prices for " + stationId}>
            Station Fuel Prices
          </Header>}
          fitHeight={true}
        >
        <div aria-live="polite">
          {showProgressBar && (
            <>
              <LoadingBar variant="gen-ai" />
            </>
          )}
        </div>

        <ColumnLayout columns={1} variant="text-grid">
          <KeyValuePairs
            columns={3}
            items={[
              {
                label: 'Regular Type',
                value: (
                  <Link variant="awsui-value-large" href="#">
                    ${currentFuelPrices?.prices.regularFuelPrice.toFixed(2)}
                  </Link>
                ),
              },
              {
                label: 'Mid Type',
                value: (
                  <Link variant="awsui-value-large" href="#">
                    ${currentFuelPrices?.prices.midFuelPrice.toFixed(2)}
                  </Link>
                ),
              },
              {
                label: 'Premium Type',
                value: (
                  <Link variant="awsui-value-large" href="#">
                    ${currentFuelPrices?.prices.premiumFuelPrice.toFixed(2)}
                  </Link>
                ),
              }
            ]}
          />
          <KeyValuePairs
            columns={3}
            items={[
              {
                label: 'Zenith Fuel',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                    <TextContent>
                    <h1>${currentFuelPrices?.prices.ZenithFuelRegularFuelPrice.toFixed(2)}</h1>
                    </TextContent>
                    <div >
                      <Icon name="angle-up" />
                    </div>
                  </Grid>           
                ),
              },
              {
                label: 'Zenith Fuel',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.ZenithFuelMidFuelPrice.toFixed(2)}</h1>
                    </TextContent>
                    <Icon name="angle-down" />
                  </Grid> 
                ),
              },
              {
                label: 'Zenith Fuel',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.ZenithFuelPremiumFuelPrice.toFixed(2)}</h1>
                  </TextContent>
                    <Icon name="angle-up" />
                  </Grid> 
                ),
              },
              {
                label: 'Horizon Energy',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.HorizonEnergyRegularFuelPrice.toFixed(2)}</h1>
                  </TextContent>
                    <Icon name="angle-down" />
                  </Grid> 
                ),
              },
              {
                label: 'Horizon Energy',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.HorizonEnergyMidFuelPrice.toFixed(2)}</h1>
                    </TextContent>
                    <Icon name="angle-up" />
                  </Grid> 
                ),
              },
              {
                label: 'Horizon Energy',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.HorizonEnergyPremiumFuelPrice.toFixed(2)}</h1>
                  </TextContent>
                    <Icon name="angle-down" />
                  </Grid> 
                ),
              },
              {
                label: 'Meridian Petrol',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.MeridianPetrolRegularFuelPrice.toFixed(2)}</h1>
                  </TextContent>
                    <Icon name="angle-down" />
                  </Grid> 
                ),
              },
              {
                label: 'Meridian Petrol',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                    <h1>${currentFuelPrices?.prices.MeridianPetrolMidFuelPrice.toFixed(2)}</h1>
                    </TextContent>
                    <Icon name="angle-up" />
                  </Grid> 
                ),
              },
              {
                label: 'Meridian Petrol',
                value: (
                  <Grid
                    gridDefinition={[
                      { colspan: { l: 5, m: 5, default: 5 } },                
                    ]}
                  >
                  <TextContent>
                  <h1>${currentFuelPrices?.prices.MeridianPetrolPremiumFuelPrice.toFixed(2)}</h1>
                  </TextContent>
                    <Icon name="angle-down" />
                  </Grid> 
                ),
              },
            ]}
          />
          </ColumnLayout>
    </Container>
    
  );
}
