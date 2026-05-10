import { Alert, List, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

import { getErrorMessages } from '@utils/error';

import type { AlertProps } from '@mantine/core';
import type React from 'react';

type ErrorAlertContentProps =
  | { error: unknown; message?: never; messages?: never }
  | { error?: never; message: string; messages?: never }
  | { error?: never; message?: never; messages: string[] };

type ErrorAlertProps = Omit<AlertProps, 'children'> & ErrorAlertContentProps;

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  message,
  messages: explicitMessages,
  color = 'red',
  icon = <IconAlertCircle size={16} />,
  ...alertProps
}) => {
  const messages = explicitMessages ?? (message !== undefined ? [message] : getErrorMessages(error));

  return (
    <Alert color={color} icon={icon} {...alertProps}>
      {messages.length > 1 ? (
        <List size="sm" spacing={4} withPadding>
          {messages.map((message, index) => (
            <List.Item key={`${index}-${message}`}>{message}</List.Item>
          ))}
        </List>
      ) : (
        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {messages[0]}
        </Text>
      )}
    </Alert>
  );
};

export default ErrorAlert;
