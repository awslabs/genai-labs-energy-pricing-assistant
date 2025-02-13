// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { useState, useEffect, useRef } from 'react';
import { useCollection } from '@cloudscape-design/collection-hooks';
import { CARD_DEFINITIONS, VISIBLE_CONTENT_OPTIONS, PAGE_SIZE_OPTIONS, DEFAULT_PREFERENCES } from './cards-config';
import { Cards, CollectionPreferences, Pagination, TextFilter } from '@cloudscape-design/components';
import { ToolsContent } from './common-components';
import BaseAppLayout from "../../components/base-app-layout";
import { BreadcrumbGroup } from "@cloudscape-design/components";
import { useOnFollow } from "../../common/hooks/use-on-follow";
import { APP_NAME } from "../../common/constants";
import useWebSocket from 'react-use-websocket';
import { getCurrentUser } from 'aws-amplify/auth';

import {
  Notifications,
  TableEmptyState,
  TableNoMatchState,
} from '../commons/common-components';

import { FullPageHeader } from '../commons';
import {
  getTextFilterCounterText,
  stationsTableAriaLabels,
  getHeaderCounterText,
  renderAriaLive,
} from '../../i18n-strings';
import { useLocalStorage } from '../commons/use-local-storage';
import '../../styles/base.scss';


export function DetailsCards({ wsurl, idToken, loadHelpPanelContent }) {
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestState] = useState(false);

  const [preferences, setPreferences] = useLocalStorage('React-Cards-Preferences', DEFAULT_PREFERENCES);

  const wsUrl = `${wsurl}?idToken=${idToken}`;  // const chatHistoryRef = useRef(null);
  const [bedrockSessionId, setBedrockSessionId] = useState('');
  const [stations, setStation] = useState([]);

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
  const updateStations = (message) => {
    //console.log('message:', message)
    if (message && message.stations) {
      setStation(message.stations);
      setLoading(false);
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
      if (loading && stations.length == 0 && message.type === 'stations') {
        updateStations(message);
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

    if (!requestSent) {
      if (storedBedrockSessionId) {
        getStations(storedBedrockSessionId)
        setRequestState(true)
      }
    }
  }, [lastMessage, sendMessage, requestSent]);

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
  const getStations = async (sessionId) => {
    const data = {
      type: 'stations',
      session_id: sessionId,
    }
    sendMessage(JSON.stringify(data));
  };

  const { items, actions, filteredItemsCount, collectionProps, filterProps, paginationProps } = useCollection(
    stations,
    {
      filtering: {
        empty: <TableEmptyState resourceName="Stations" />,
        noMatch: <TableNoMatchState onClearFilter={() => actions.setFiltering('')} />,
      },
      pagination: { pageSize: preferences.pageSize },
      selection: {},
    }
  );

  return (
    <Cards
      {...collectionProps}
      stickyHeader={true}
      cardDefinition={CARD_DEFINITIONS}
      visibleSections={preferences.visibleContent}
      loading={loading}
      loadingText="Loading stations"
      items={items}
      selectionType="single"
      variant="full-page"
      ariaLabels={stationsTableAriaLabels}
      renderAriaLive={renderAriaLive}
      header={
        <FullPageHeader
          selectedItemsCount={collectionProps.selectedItems.length}
          counter={!loading && getHeaderCounterText(stations, collectionProps.selectedItems)}
          onInfoLinkClick={loadHelpPanelContent}
        />
      }
      filter={
        <TextFilter
          {...filterProps}
          filteringAriaLabel="Filter stations"
          filteringPlaceholder="Find stations"
          filteringClearAriaLabel="Clear"
          countText={getTextFilterCounterText(filteredItemsCount)}
          disabled={loading}
        />
      }
      pagination={<Pagination {...paginationProps} disabled={loading} />}
      preferences={
        <CollectionPreferences
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
          disabled={loading}
          preferences={preferences}
          onConfirm={({ detail }) => setPreferences(detail)}
          pageSizePreference={{
            title: 'Page size',
            options: PAGE_SIZE_OPTIONS,
          }}
          visibleContentPreference={{
            title: 'Select visible columns',
            options: VISIBLE_CONTENT_OPTIONS,
          }}
        />
      }
    />
  );
}

export default function Stations(props) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const appLayout = useRef();


  const onFollow = useOnFollow();

  return (
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
          ]}
          expandAriaLabel="Show path"
          ariaLabel="Breadcrumbs"
        />
      }
      content={
        <DetailsCards
          wsurl={props.wsUrl}
          idToken={props.idToken}
          loadHelpPanelContent={() => {
            setToolsOpen(true);
            appLayout.current?.focusToolsClose();
          }}
        />
      }
      contentType="cards"
      tools={<ToolsContent />}
      toolsOpen={toolsOpen}
      onToolsChange={({ detail }) => setToolsOpen(detail.open)}
      stickyNotifications={true}
    />
  );
}