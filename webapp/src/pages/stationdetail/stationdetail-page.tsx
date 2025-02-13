// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { useRef, useEffect, useState } from 'react';

import { AppLayoutProps } from '@cloudscape-design/components/app-layout';
import Button from '@cloudscape-design/components/button';
import Grid from '@cloudscape-design/components/grid';
import SpaceBetween from '@cloudscape-design/components/space-between';
import Modal from "@cloudscape-design/components/modal";
import { Box, KeyValuePairs, ColumnLayout, TextContent, BarChart } from '@cloudscape-design/components';
import LoadingBar from "@cloudscape-design/chat-components/loading-bar";
import ReactMarkdown from "react-markdown";
import { useSearchParams } from 'react-router-dom';

import '@cloudscape-design/global-styles/dark-mode-utils.css';
import '../../styles/base.scss';

import { DashboardHeader, DashboardMainInfo } from './components/header';
import { Notifications, HelpPanelProvider } from '../commons';

import BaseAppLayout from "../../components/base-app-layout";
import { BreadcrumbGroup } from "@cloudscape-design/components";
import { useOnFollow } from "../../common/hooks/use-on-follow";
import { APP_NAME } from "../../common/constants";

import useWebSocket from 'react-use-websocket';
import { getCurrentUser } from 'aws-amplify/auth';
import StationOverviewWidget from './widgets/station-overview';
import StationPricesContent from './widgets/station-prices';
import EventsContent from './widgets/events'
import StationStatusContent from './widgets/station-status';
import { FeaturesSpotlightContent } from './widgets/features-spotlight';

export type StationDetailProps = {
  wsUrl: string,
  idToken: string,
  station: string
}

export type FuelPricesProps = {
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

/**
 * Extracts the fuel price in bold **$4.50** from text response from bedrock.
 *
 * @param {string} input - Text containing price to extract
 * @returns {string} - Extracted price
 */
function extractPrice(input: string): string | null {
  const regex = /\*\*(.*?)\*\*/;
  const match = input.match(regex);
  if (match) {
    return match[1];
  }
  return null;
}


function Content(props: StationDetailProps) {
  return (
    <Grid
      gridDefinition={[
        { colspan: { l: 8, m: 8, default: 12 } },
        { colspan: { l: 4, m: 4, default: 12 } },
        { colspan: { l: 12, m: 12, default: 12 } },
        { colspan: { l: 8, m: 8, default: 12 } },
        { colspan: { l: 4, m: 4, default: 12 } },
      ]}
    >
      <StationOverviewWidget wsUrl={props.wsUrl} idToken={props.idToken} station={props.station} />
      <StationStatusContent wsUrl={props.wsUrl} idToken={props.idToken} station={props.station} />
      <StationPricesContent wsUrl={props.wsUrl} idToken={props.idToken} station={props.station} />
      <EventsContent wsUrl={props.wsUrl} idToken={props.idToken} station={props.station} />
      <FeaturesSpotlightContent wsUrl={props.wsUrl} idToken={props.idToken} station={props.station} />
    </Grid>
  );
}

export default function StationDetail(props: StationDetailProps) {
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;  // const chatHistoryRef = useRef(null);
  let stationId: string | undefined; // Explicitly define the type
  const storedStationId = localStorage.getItem('stationId'); // Store the raw value
  if (storedStationId !== null) {
    stationId = storedStationId; // Assign only if it's a string
  } else {
    stationId = '';  // or your default value (undefined or some other string)
  }
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id'); // Get the 'id' query parameter
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [toolsContent, setToolsContent] = useState<React.ReactNode>(() => <DashboardMainInfo station={stationId} />);
  const appLayout = useRef<AppLayoutProps.Ref>(null);
  const [showChangeFuelPriceModal, setShowChangeFuelPriceModal] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [priceEstimateRequested, setPriceEstimateRequested] = useState(false);
  const [message, setMessages] = useState('');
  const [suggestedPrice, setSuggestedPrice] = useState('$-.--');
  const [currentFuelPrices, setCurrentFuelPrices] = useState<FuelPricesProps>();

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
   * Updates the message state and potentially extracts a suggested price.
   *
   * This function takes a message object, which should have a `delta` property containing the new text content.
   * It appends this new text to the existing message state.
   * If a price surrounded by double asterisks (**) is found in the updated message, it is extracted and used to update the `suggestedPrice` state.
   *
   * @param {Object} message - The message object containing the delta text.
   * @param {Object} message.delta - The delta object containing the new text content.
   * @param {string} message.delta.text - The new text content to append to the existing message.
   */
  const updateMessage = (message: { delta: any; }) => {
    //console.log('message:', message)
    if (message && message.delta && message.delta.text) {
      setMessages((prevMessage) => {
        const lastMessage = prevMessage;
        const updatedMessage = lastMessage + message.delta.text;
        const price = extractPrice(updatedMessage);
        if (price) {
          setSuggestedPrice(price);
        }
        return updatedMessage;
      });
    }
  };

  /**
   * Updates the current fuel prices state based on a provided message object.
   * 
   * This function checks if the message object exists and has a valid `regularFuelPrice` property. 
   * If both conditions are met, the `setCurrentFuelPrices` function is called to update the state with the new fuel prices from the message.
   *
   * @param {FuelPricesProps} message - An object containing the latest fuel prices.
   * @param {number} message.regularFuelPrice - The price of regular fuel (required).
   * // Additional properties (optional):
   * // @param {number} [message.midFuelPrice] - The price of mid-grade fuel.
   * // @param {number} [message.premiumFuelPrice] - The price of premium fuel. 
   */
  const updateFuelPrices = (message: FuelPricesProps) => {
    //console.log('message:', message)
    if (message && message.prices && message.prices.regularFuelPrice) {
      setCurrentFuelPrices(message);
    }
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
    if (lastMessage !== null && lastMessage.data.length > 0) {
      const message = JSON.parse(lastMessage.data);

      if (message.type === 'content_block_delta') {
        updateMessage(message);
      }
      else if (message.type === 'message_stop') {
        updateMessage(message);
      }
      else if (currentFuelPrices == null && message.type === 'current_fuel_prices') {
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

    if (showProgressBar) {

      if (lastMessage !== null && lastMessage.data.length > 0) {
        const message = JSON.parse(lastMessage.data);
        if (message.type === 'content_block_delta') {
          setShowProgressBar(false);
        }
      }
      else {
        if (!priceEstimateRequested && storedBedrockSessionId) {
          setPriceEstimateRequested(true);
          onGetPricingEstimate(storedBedrockSessionId, JSON.stringify(
            {
              "prompttype": "priceestimate",
              "station": stationId
            }
          ))
        }
      }
    }

    if (lastMessage == null || lastMessage.data.length == 0) {
      if (currentFuelPrices == null && storedBedrockSessionId) {
        onGetStationFuelPrices(storedBedrockSessionId, stationId)
      }
    }

  }, [lastMessage, sendMessage, showProgressBar, priceEstimateRequested]);

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

  /**
   * Sends a message to request a price estimate.
   *
   * This function constructs a message object with the type 'price_estimate', the provided prompt, and the session ID. 
   * It then serializes the message object to JSON and calls the `sendMessage` function to send the request.
   *
   * @async
   * @param {string} sessionId - The ID of the session.
   * @param {string} message - The prompt or message used to request the price estimate.
   * @returns {Promise<void>} - A Promise that resolves when the message has been sent.
   */
  const onGetPricingEstimate = async (sessionId: string, message: string) => {
    const data = {
      type: 'price_estimate',
      prompt: message,
      session_id: sessionId,
    }
    sendMessage(JSON.stringify(data));
  };

  const handleToolsContentChange = (content: React.ReactNode) => {
    setToolsOpen(true);
    setToolsContent(content);
    appLayout.current?.focusToolsClose();
  };

  const handleChangeFuelPriceClick = () => {
    setShowProgressBar(true);
    setShowChangeFuelPriceModal(true);
  };

  const handleChangeFuelPriceModalClose = () => {
    setPriceEstimateRequested(false);
    setMessages('');
    setSuggestedPrice('$-.--');
    setShowChangeFuelPriceModal(false);
  };

  const onFollow = useOnFollow();

  return (
    <HelpPanelProvider value={handleToolsContentChange}>
      <BaseAppLayout
        notifications={<Notifications successNotification={true} />}
        breadcrumbs={
          <BreadcrumbGroup
            onFollow={onFollow}
            items={[
              {
                text: APP_NAME,
                href: "/",
              },
              {
                text: "Stations",
                href: "/",
              },
              {
                text: "Station Details",
                href: "/stationdetail",
              },
            ]}
            expandAriaLabel="Show path"
            ariaLabel="Breadcrumbs"
          />
        }
        content={
          <SpaceBetween size="m">
            <DashboardHeader station={stationId} actions={<Button variant="primary" onClick={handleChangeFuelPriceClick}>Change Regular Fuel Price</Button>} />
            <Content wsUrl={props.wsUrl} idToken={props.idToken} station={stationId} />
          </SpaceBetween>
        }
        tools={toolsContent}
        toolsOpen={toolsOpen}
        onToolsChange={({ detail }) => setToolsOpen(detail.open)}
      />
      <Modal
        size="large"
        onDismiss={handleChangeFuelPriceModalClose}
        visible={showChangeFuelPriceModal}
        header="Change Regular Fuel Price"
        footer={
          <div>
            <Button variant="primary" onClick={handleChangeFuelPriceModalClose}>
              Save
            </Button>
          </div>
        }
      >
        <div aria-live="polite">
          {showProgressBar && (
            <>
              <Box margin={{ bottom: 'xs', left: 'l' }} color="text-body-secondary">
                Evaluating strategy
              </Box>
              <LoadingBar variant="gen-ai" />
            </>
          )}
        </div>

        {!showProgressBar && (
          <Grid>
            <ColumnLayout columns={1} variant="text-grid">
              <KeyValuePairs
                columns={3}
                items={[
                  {
                    label: 'Current Price',
                    value: (
                      <TextContent>
                        <h1>{currentFuelPrices?.prices.regularFuelPrice}</h1>
                      </TextContent>
                    ),
                  },
                  {
                    label: 'Rule Based Price',
                    value: (
                      <TextContent>
                        <h1>$0 (-5.00)</h1>
                      </TextContent>
                    ),
                  },
                  {
                    label: 'AI Suggested Price',
                    value: (
                      <TextContent>
                        <h1>{suggestedPrice}</h1>
                      </TextContent>
                    ),
                  }
                ]}
              />
            </ColumnLayout>

            <TextContent>
              <h4>Reasoning:</h4>
              <ReactMarkdown
                children={message} />
            </TextContent>
            <Grid
              gridDefinition={[
                { colspan: { default: 12, xxs: 6 } },
                { colspan: { default: 12, xxs: 6 } }
              ]}>
              <BarChart
                series={[
                  {
                    title: "Market",
                    type: "bar",
                    data: [
                      { x: "Gallons", y: currentFuelPrices?.prices.volumeOfGasSold },
                    ]
                  },
                  {
                    title: "Optimal",
                    type: "bar",
                    data: [
                      { x: "Gallons", y: currentFuelPrices?.prices.volumeOfGasSold + (currentFuelPrices?.prices.volumeOfGasSold * .1) },
                    ]
                  }
                ]}
                xDomain={["Gallons"]}
                yDomain={[0, 6000]}
                hideFilter
                ariaLabel="Stacked, horizontal bar chart"
                height={200}
                horizontalBars
                xTitle="Volume Sold"
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No data available</b>
                    <Box variant="p" color="inherit">
                      There is no data available
                    </Box>
                  </Box>
                }
                noMatch={
                  <Box textAlign="center" color="inherit">
                    <b>No matching data</b>
                    <Box variant="p" color="inherit">
                      There is no matching data to display
                    </Box>
                    <Button>Clear filter</Button>
                  </Box>
                }
              />

              <BarChart
                series={[
                  {
                    title: "Market",
                    type: "bar",
                    data: [
                      { x: "Profit ($)", y: 4000 }
                    ]
                  },
                  {
                    title: "Optimal",
                    type: "bar",
                    data: [
                      { x: "Profit ($)", y: 4500 }
                    ]
                  }
                ]}
                xDomain={["Profit ($)"]}
                yDomain={[0, 5000]}
                hideFilter
                ariaLabel="Stacked, horizontal bar chart"
                height={200}
                horizontalBars
                xTitle="Gross Fuel Profit"
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No data available</b>
                    <Box variant="p" color="inherit">
                      There is no data available
                    </Box>
                  </Box>
                }
                noMatch={
                  <Box textAlign="center" color="inherit">
                    <b>No matching data</b>
                    <Box variant="p" color="inherit">
                      There is no matching data to display
                    </Box>
                    <Button>Clear filter</Button>
                  </Box>
                }
              />
            </Grid>
          </Grid>
        )}
      </Modal>
    </HelpPanelProvider>
  );
}