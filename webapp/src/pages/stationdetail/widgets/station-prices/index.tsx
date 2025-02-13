// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Header, LineChart, Link } from '@cloudscape-design/components';
import { commonChartProps, dateTimeFormatter } from '../chart-commons';
import { Container } from '@cloudscape-design/components';
import { useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { getCurrentUser} from 'aws-amplify/auth';
import { LineChartProps } from '@cloudscape-design/components';

export type StationPricesProps = {
  wsUrl: string,
  idToken: string,
  station: string
}

export type FuelPricesProps = {
  'prices': [
      {
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
  ]
}

interface StationPrice { 
  date: Date;
  'Zenith Fuels': number;
  'Horizon Energy': number;
  'Meridian Petrol': number;
  'This Station': number;
}

export default function StationPricesContent(props: StationPricesProps) {
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;  // const chatHistoryRef = useRef(null);
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const stationId = props.station ? props.station : ""
  const [historicalFuelPrices, setHistoricalFuelPrices] = useState<FuelPricesProps>();
  const [stationPricesDomain, setStationPricesDomain] = useState<Date[]>([]);
  const [stationPricesSeries, setStationPricesSeries] = useState<LineChartProps<Date>['series']>([]);
  const [yDomain, setYDomain] = useState<number[]>();

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
   * @param {FuelPricesProps} message - An object containing the latest fuel prices.
   * @param {number} message.regularFuelPrice - The price of regular fuel (required).
   * // Additional properties (optional):
   * // @param {number} [message.midFuelPrice] - The price of mid-grade fuel.
   * // @param {number} [message.premiumFuelPrice] - The price of premium fuel. 
   */
  const updateHistoricalFuelPrices = (message: FuelPricesProps) => {
    //console.log('message:', message)
    if (message && message.prices.length > 0) {
      setHistoricalFuelPrices(message);
      let maxY = 0;
      let minY = 100;
      const stationPricesData: StationPrice[] = []; // Use the interface for type safety
      message.prices.forEach(record => {
        if (record.regularFuelPrice > maxY) {
          maxY = record.regularFuelPrice;
        }
      
        if (record.regularFuelPrice < minY) {
          minY = record.regularFuelPrice;
        }
        stationPricesData.push({
          date: new Date(record.timestamp),
          'Zenith Fuels': record.ZenithFuelRegularFuelPrice,
          'Horizon Energy': record.HorizonEnergyRegularFuelPrice,
          'Meridian Petrol': record.MeridianPetrolRegularFuelPrice,
          'This Station': record.regularFuelPrice
        })
      });
      
      maxY = maxY + (maxY * .1)
      minY = minY - (minY * .2)
      setYDomain([minY,maxY]);

      const stationPricesSeries: LineChartProps<Date>['series'] = [
        {
          title: 'Zenith Fuels',
          type: 'line',
          valueFormatter: value => value.toLocaleString('en-US'),
          data: stationPricesData.map(datum => ({ x: datum.date, y: datum['Zenith Fuels'] })),
        },
        {
          title: 'Horizon Energy',
          type: 'line',
          valueFormatter: value => value.toLocaleString('en-US'),
          data: stationPricesData.map(datum => ({ x: datum.date, y: datum['Horizon Energy'] })),
        },
        {
          title: 'Meridian Petrol',
          type: 'line',
          valueFormatter: value => value.toLocaleString('en-US'),
          data: stationPricesData.map(datum => ({ x: datum.date, y: datum['Meridian Petrol'] })),
        },
        {
          title: 'This Station',
          type: 'line',
          valueFormatter: value => value.toLocaleString('en-US'),
          data: stationPricesData.map(datum => ({ x: datum.date, y: datum['This Station'] })),
        },
      ];
      
      const stationPricesDomain = [
        stationPricesData[0].date,
        stationPricesData[stationPricesData.length - 1].date,
      ];

      setStationPricesSeries(stationPricesSeries);
      setStationPricesDomain(stationPricesDomain);

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

        if (historicalFuelPrices == null && message.type === 'historical_fuel_prices') {
          updateHistoricalFuelPrices(message);
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
      if(historicalFuelPrices == null && storedBedrockSessionId) {
        onGetStationHistoricalFuelPrices(storedBedrockSessionId, stationId)
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
          header={<Header variant="h2" description="Last week">
            Regular Fuel Prices
          </Header>}
          fitHeight={true}
        >
      <LineChart
        {...commonChartProps}
        hideFilter={true}
        fitHeight={true}
        height={150}
        series={stationPricesSeries}
        xDomain={stationPricesDomain}
        yDomain={yDomain}
        xScaleType="time"
        xTitle="Time (UTC)"
        yTitle="Fuel Price ($)"
        
        i18nStrings={{
          ...commonChartProps.i18nStrings,
          filterLabel: 'Filter displayed instances',
          filterPlaceholder: 'Filter instances',
          xTickFormatter: dateTimeFormatter,
        }}
        detailPopoverSeriesContent={({ series, y }) => ({
          key: (
            <Link external={true} href="#">
              {series.title}
            </Link>
          ),
          value: y,
        })}
      />
    </Container>
  );
}
