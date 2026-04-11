import { notifications } from '@mantine/notifications';

import { getErrorMessage } from './error';

export function notifySuccess(message: string): void {
  notifications.show({ color: 'green', message });
}

export function notifyError(error: unknown): void {
  notifications.show({ color: 'red', message: getErrorMessage(error) });
}

export function notifyErrorMessage(message: string): void {
  notifications.show({ color: 'red', message });
}
