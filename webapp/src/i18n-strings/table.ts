// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import { TableProps } from '@cloudscape-design/components';

export const baseTableAriaLabels: TableProps.AriaLabels<unknown> = {
  allItemsSelectionLabel: () => 'select all',
};

const baseEditableLabels: TableProps.AriaLabels<{ id: string }> = {
  activateEditLabel: (column, item) => `Edit ${item.id} ${column.header}`,
  cancelEditLabel: column => `Cancel editing ${column.header}`,
  submitEditLabel: column => `Submit edit ${column.header}`,
};

export const stationsTableAriaLabels: TableProps.AriaLabels<{ id: string }> = {
  ...baseTableAriaLabels,
  itemSelectionLabel: (data, row) => `select ${row.id}`,
  selectionGroupLabel: 'Station selection',
};

export const distributionEditableTableAriaLabels: TableProps.AriaLabels<{ id: string }> = {
  ...stationsTableAriaLabels,
  ...baseEditableLabels,
};

export function createTableSortLabelFn(
  column: TableProps.ColumnDefinition<unknown>
): TableProps.ColumnDefinition<unknown>['ariaLabel'] {
  if (!column.sortingField && !column.sortingComparator && !column.ariaLabel) {
    return;
  }
  return ({ sorted, descending }) => {
    return `${column.header}, ${sorted ? `sorted ${descending ? 'descending' : 'ascending'}` : 'not sorted'}.`;
  };
}
