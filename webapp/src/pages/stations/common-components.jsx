// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { BreadcrumbGroup, HelpPanel } from '@cloudscape-design/components';
import { resourcesBreadcrumbs } from '../../common/breadcrumbs';
import { ExternalLinkGroup } from '../commons';

export const Breadcrumbs = () => (
  <BreadcrumbGroup items={resourcesBreadcrumbs} expandAriaLabel="Show path" ariaLabel="Breadcrumbs" />
);

const toolsFooter = (
  <ExternalLinkGroup
    items={[
      {
        text: 'Pricing 101: Demystifying Retail Fuel Prices and Players',
        href: 'https://www.opisnet.com/blog/demystifying-retail-fuel-prices-and-players/',
      }
    ]}
  />
);
export const ToolsContent = () => (
  <HelpPanel footer={toolsFooter} header={<h2>Stations</h2>}>
    <p>
      View your current gas stations and select one to drill down into pricing details and controls.
    </p>
  </HelpPanel>
);