// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import React, { useId, useState } from 'react';
import Flashbar, { FlashbarProps } from '@cloudscape-design/components/flashbar';
import { useDisclaimerFlashbarItem } from './disclaimer-flashbar-item';

function useNotifications(showSuccessNotification = false) {
  const successId = useId();
  const [successDismissed, dismissSuccess] = useState(false);
  const [disclaimerDismissed, dismissDisclaimer] = useState(false);

  const notifications: Array<FlashbarProps.MessageDefinition> = [];

  if (showSuccessNotification && !successDismissed) {
    notifications.push({
      type: 'error',
      content: 'Pricing adjustment suggested for Station 1 due to traffic event',
      statusIconAriaLabel: 'error',
      dismissLabel: 'Dismiss message',
      dismissible: true,
      onDismiss: () => dismissSuccess(true),
      id: successId,
    });
  }

  return notifications;
}

interface NotificationsProps {
  successNotification?: boolean;
}

export function Notifications({ successNotification }: NotificationsProps) {
  const notifications = useNotifications(successNotification);
  return <Flashbar items={notifications} />;
}
