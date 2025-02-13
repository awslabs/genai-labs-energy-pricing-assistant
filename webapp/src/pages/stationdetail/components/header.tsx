// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React from 'react';
import { HelpPanel, Header } from '@cloudscape-design/components';
import { ExternalLinkGroup, InfoLink, useHelpPanel } from '../../commons';

export type StationProps = {
  station?: string
}

export type DashboardHeaderProps = {
  actions: React.ReactNode,
  station: string
}

export function DashboardMainInfo(props: StationProps) {
  return (
    <HelpPanel
      header={<h2>{props.station}</h2>}
      footer={
        <ExternalLinkGroup
          items={[
          ]}
        />
      }
    >
      <p>
        {props.station} gas station information
      </p>
    </HelpPanel>
  );
}

export function DashboardHeader(props: DashboardHeaderProps) {
  const loadHelpPanelContent = useHelpPanel();
  return (
    <Header
      variant="h1"
      info={<InfoLink onFollow={() => loadHelpPanelContent(<DashboardMainInfo station={props.station} />)} />}
      actions={props.actions}
    >
      {props.station}
    </Header>
  );
}
