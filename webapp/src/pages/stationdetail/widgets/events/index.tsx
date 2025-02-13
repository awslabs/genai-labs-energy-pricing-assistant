// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {
  Container,
  Header,
  StatusIndicator,
  StatusIndicatorProps,
  Table,
  TableProps,
} from '@cloudscape-design/components';
import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { getCurrentUser} from 'aws-amplify/auth';


export type EventsWSProps = {
  wsUrl: string,
  idToken: string,
  station: string
}

export type EventsProps = {
  'prices': [
      {
      'timestamp': any,
      'weatherCondition': any
      'trafficEvents': any
    }
  ]
}

const eventsDefinition: Array<TableProps.ColumnDefinition<({ name: string; id: string; type: string; statusText: string; status: string; timestamp: Date; })>> = [
  {
    id: 'time',
    header: 'Event Time',
    cell: item => item.timestamp.toLocaleString(),
    minWidth: 135,
    width: 180,
    isRowHeader: true,
  },
  {
    id: 'name',
    header: 'Event name',
    cell: item => item.name,
    minWidth: 135,
    width: 250,
    isRowHeader: true,
  },
  {
    id: 'status',
    header: 'Event status',
    cell: ({ statusText, status }) => (
      <StatusIndicator type={status as StatusIndicatorProps.Type}>{statusText}</StatusIndicator>
    ),
    minWidth: 120,
    width: 130,
  },
  {
    id: 'type',
    header: 'Event type',
    cell: item => item.type,
    minWidth: 130,
    width: 135,
  },
];

export default function EventsContent(props: EventsWSProps) {
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;  // const chatHistoryRef = useRef(null);
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const [eventItems, setEventItems] = useState<readonly { name: string; id: string; type: string; statusText: string; status: string; timestamp: Date; }[]>([]);
  const stationId = props.station ? props.station : ""
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
   * Updates the historical fuel prices state based on a provided message object.
   * 
   * This function checks if the message object exists and has a valid `regularFuelPrice` property. 
   * If both conditions are met, the `setCurrentFuelPrices` function is called to update the state with the new fuel prices from the message.
   *
   * @param {EventsProps]} message - An object containing the latest fuel prices.
   * @param {number} message.regularFuelPrice - The price of regular fuel (required).
   * // Additional properties (optional):
   * // @param {number} [message.midFuelPrice] - The price of mid-grade fuel.
   * // @param {number} [message.premiumFuelPrice] - The price of premium fuel. 
   */
  const updateEvents = (message: EventsProps) => {
    //console.log('message:', message)
    if (message && message.prices.length > 0) {
      const items: { name: string; id: string; type: string; statusText: string; status: string; timestamp: Date; }[] = [];
     
      let count = 0
      message.prices.forEach(record => {
        const weatherItem: { name: string; id: string; type: string; statusText: string; status: string; timestamp: Date; } = {
          id: record.timestamp,
          timestamp: new Date(record.timestamp),
          name: record.weatherCondition,
          status: count==0 ? "pending" : "success",
          statusText: count==0 ? "Today" : "Resolved",
          type: "weather",
        }
        items.push(weatherItem)

        const trafficItem: { name: string; id: string; type: string; statusText: string; status: string; timestamp: Date; } = {
          id: record.timestamp,
          timestamp: new Date(record.timestamp),
          name: record.trafficEvents,
          status: count==0 ? "pending" : "success",
          statusText: count==0 ? "Ongoing" : "Resolved",
          type: "traffic"
        }
        items.push(trafficItem)

        count = count + 1;

      });
      
      setEventItems(items);
    }
  };

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
      if(eventItems.length == 0 && storedBedrockSessionId) {
        onGetStationHistoricalFuelPrices(storedBedrockSessionId, stationId)
      }
    }

  }, [lastMessage, sendMessage]);


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

        if (eventItems.length == 0 && message.type === 'historical_fuel_prices') {
          updateEvents(message);
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
  const onGetStationHistoricalFuelPrices = async (sessionId: string, message: string) => {
    const data = {
      type: 'historical_fuel_prices',
      station: message,
      session_id: sessionId,
    }
    sendMessage(JSON.stringify(data));
  };

  return (
    <Container
          header={<Header variant="h2" description="Events">
            Events ({eventItems.length})
          </Header>}
          fitHeight={true}
        >
      <Table
        enableKeyboardNavigation={true}
        variant="borderless"
        resizableColumns={true}
        items={eventItems}
        columnDefinitions={eventsDefinition}        
        />
    </Container>
  );
}
