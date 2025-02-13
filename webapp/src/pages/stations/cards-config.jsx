// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { Link, StatusIndicator } from '@cloudscape-design/components';

export const CARD_DEFINITIONS = {
  header: item => (
    <div>
      <Link onClick={(event) => {
          event.preventDefault();
          localStorage.setItem('stationId', item.station);
        }}
        fontSize="heading-m" href={`/stationdetail`}>
        {item.station}
      </Link>
    </div>
  ),
  sections: [
    {
      id: 'address',
      header: 'Address',
      content: item => item.address,
    },
    {
      id: 'fuelPumps',
      header: 'Fuel Pumps',
      content: item => item.fuelPumps,
    },
    {
      id: 'hoursOfOperation',
      header: 'Hours of Operation',
      content: item => item.hoursOfOperation,
    },
    {
      id: 'accessToMajorRoads',
      header: 'Access To Major Roads',
      content: item => item.accessToMajorRoads ? "Yes" : "No",
    },
    {
      id: 'state',
      header: 'State',
      content: item => (
        <StatusIndicator type={item.state === 'In Service' ? 'success' : item.state === 'Closed' ? 'error' : 'warning'}>{item.state}</StatusIndicator>
      ),
    },
  ],
};

export const VISIBLE_CONTENT_OPTIONS = [
  {
    label: 'Main station properties',
    options: [
      { id: 'address', label: 'Address' },
      { id: 'fuelPumps', label: 'Fuel Pumps' },
      { id: 'accessToMajorRoads', label: 'Access To Major Roads' },
      { id: 'hoursOfOperation', label: "Hours of Operation"},
      { id: 'state', label: 'State' },
    ],
  },
];

export const PAGE_SIZE_OPTIONS = [
  { value: 10, label: '10 Stations' },
  { value: 30, label: '30 Stations' },
  { value: 50, label: '50 Stations' },
];

export const DEFAULT_PREFERENCES = {
  pageSize: 10,
  visibleContent: ['address', 'fuelPumps', 'hoursOfOperation', 'accessToMajorRoads', 'state'],
};
