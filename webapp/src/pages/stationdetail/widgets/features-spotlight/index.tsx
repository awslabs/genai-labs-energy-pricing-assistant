// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { Box, ColumnLayout, Header, Link } from '@cloudscape-design/components';
import { Container } from '@cloudscape-design/components';
import LoadingBar from "@cloudscape-design/chat-components/loading-bar";
import useWebSocket from 'react-use-websocket';
import { getCurrentUser} from 'aws-amplify/auth';
import { useEffect, useState } from 'react';
import ReactMarkdown from "react-markdown";

export type SpotlightProps = {
  wsUrl: string,
  idToken: string,
  station: string
}

export type AIRecommendationProps = {
  'recommendation': {
    'station': any,
    'timestamp': any,
    'message': any
  }
}

export function FeaturesSpotlightContent(props: SpotlightProps) {
  const wsUrl = `${props.wsUrl}?idToken=${props.idToken}`;  // const chatHistoryRef = useRef(null);
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const stationId = props.station ? props.station : ""
  const [aiRecommendation, setAIRecommendation] = useState<AIRecommendationProps>();
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
  const updateAIRecommendation = (message: AIRecommendationProps) => {
    //console.log('message:', message)
    if (message && message.recommendation) {
      setAIRecommendation(message);
      setShowProgressBar(false);
    }
    else if(message && message.recommendation == null)
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
    if (aiRecommendation == null && lastMessage !== null && lastMessage.data.length > 0) {
      const message = JSON.parse(lastMessage.data);
        if (message.type === 'ai_recommendation') {
          updateAIRecommendation(message);
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
      if(aiRecommendation == null && storedBedrockSessionId) {
        onAIRecommendation(storedBedrockSessionId, stationId)
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
  const onAIRecommendation = async (sessionId: string, message: string) => {
    const data = {
      type: 'ai_recommendation',
      station: message,
      session_id: sessionId,
    }
    sendMessage(JSON.stringify(data));
  };

  return (
    <Container
          header={<Header variant="h2" description="Observations based on sourced data">
          AI Recommendations
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

        <ColumnLayout columns={5} variant="text-grid">
          <div>
            <Box color="text-label">{new Date(aiRecommendation?.recommendation.timestamp).toLocaleDateString()}
            </Box>
            <Box padding={{ vertical: 'xxs' }}>
              <ReactMarkdown
                children={aiRecommendation?.recommendation.message}/>
            </Box>            
          </div>
        </ColumnLayout>
  </Container>
  );
}
