// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { ReactNode, useState } from 'react';

import { useCollection } from '@cloudscape-design/collection-hooks';
import CollectionPreferences, {
  CollectionPreferencesProps,
} from '@cloudscape-design/components/collection-preferences';
import Header from '@cloudscape-design/components/header';
import Pagination from '@cloudscape-design/components/pagination';
import Table, { TableProps } from '@cloudscape-design/components/table';

import { Stock, stocksData } from './data';
import { TextFilter } from '@cloudscape-design/components';
import Box from '@cloudscape-design/components/box';
import Button from '@cloudscape-design/components/button';
import SpaceBetween from '@cloudscape-design/components/space-between';

const getFilterCounterText = (count = 0) => `${count} ${count === 1 ? 'match' : 'matches'}`;
const getHeaderCounterText = (items: readonly Stock[] = [], selectedItems: readonly Stock[] = []) => {
  return selectedItems && selectedItems.length > 0 ? `(${selectedItems.length}/${items.length})` : `(${items.length})`;
};

const columnDefinitions: TableProps<Stock>['columnDefinitions'] = [
  {
    header: 'Name',
    cell: ({ name }) => name,
    sortingField: 'name',
    minWidth: 250,
  },
  {
    header: 'Ticker',
    cell: ({ ticker }) => ticker,
    sortingField: 'ticker',
    minWidth: 50,
  },
  {
    header: 'Sector',
    cell: ({ sector }) => sector,
    sortingField: 'sector',
    minWidth: 150,
  },
  {
    header: 'Asset Class',
    cell: ({ assetClass }) => assetClass,
    sortingField: 'assetClass',
    minWidth: 50,
  },
  {
    header: 'Location',
    cell: ({ location }) => location,
    sortingField: 'location',
    minWidth: 100,
  },
  {
    header: 'Exchange',
    cell: ({ exchange }) => exchange,
    sortingField: 'exchange',
    minWidth: 180,
  },
  {
    header: 'Currency',
    cell: ({ currency }) => currency,
    sortingField: 'currency',
    minWidth: 50,
  },
];

const EmptyState = ({ title, subtitle, action }: { title: string; subtitle: string; action: ReactNode }) => {
  return (
    <Box textAlign="center" color="inherit">
      <Box variant="strong" textAlign="center" color="inherit">
        {title}
      </Box>
      <Box variant="p" padding={{ bottom: 's' }} color="inherit">
        {subtitle}
      </Box>
      {action}
    </Box>
  );
};

export interface ETFTableProps {
  Stocks: Stock[];
}

export default function ETFTable() {
  const [Stocks] = useState<Stock[]>(stocksData);
  const [preferences, setPreferences] = useState<CollectionPreferencesProps['preferences']>({ pageSize: 15 });
  const { items, filterProps, actions, filteredItemsCount, paginationProps, collectionProps } = useCollection<Stock>(
    Stocks,
    {
      filtering: {
        noMatch: (
          <EmptyState
            title="No matches"
            subtitle="We can’t find a match."
            action={<Button onClick={() => actions.setFiltering('')}>Clear filter</Button>}
          />
        ),
        empty: (
          <EmptyState title="No Stocks" subtitle="No Stocks to display." action={<Button>Create Stock</Button>} />
        ),
      },
      pagination: { pageSize: preferences?.pageSize },
      sorting: { defaultState: { sortingColumn: columnDefinitions[0] } },
      selection: {},
    }
  );

  return (
    <Table<Stock>
      {...collectionProps}
      enableKeyboardNavigation={false}
      items={items}
      columnDefinitions={columnDefinitions}
      stickyHeader={true}
      resizableColumns={true}
      variant="full-page"
      selectionType="single"
      ariaLabels={{
        selectionGroupLabel: 'Items selection',
        itemSelectionLabel: ({ selectedItems }, item) => {
          const isItemSelected = selectedItems.filter(i => i.name === item.name).length;
          return `${item.name} is ${isItemSelected ? '' : 'not '}selected`;
        },
        tableLabel: 'Stocks table',
      }}
      header={
        <Header
          variant="awsui-h1-sticky"
          counter={getHeaderCounterText(Stocks, collectionProps.selectedItems)}
          actions={
            <SpaceBetween size="xs" direction="horizontal">
              <Button disabled={collectionProps.selectedItems?.length === 0}>Edit</Button>
            </SpaceBetween>
          }
        >
          Stocks
        </Header>
      }
      pagination={<Pagination {...paginationProps} />}
      filter={
        <TextFilter
          {...filterProps}
          filteringPlaceholder="Find Stocks"
          countText={getFilterCounterText(filteredItemsCount)}
        />
      }
      preferences={
        <CollectionPreferences
          preferences={preferences}
          pageSizePreference={{
            title: 'Select page size',
            options: [
              { value: 10, label: '10 resources' },
              { value: 20, label: '20 resources' },
              { value: 50, label: '50 resources' },
              { value: 100, label: '100 resources' },
            ],
          }}
          onConfirm={({ detail }) => setPreferences(detail)}
          title="Preferences"
          confirmLabel="Confirm"
          cancelLabel="Cancel"
        />
      }
    />
  );
}