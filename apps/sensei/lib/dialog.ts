/**
 * lib/dialog.ts — Cross-platform dialogs.
 *
 * React Native's `Alert.alert` does not work on web: it renders a basic
 * `window.alert` and silently drops the button callbacks, so any confirmation
 * dialog does nothing on web. These helpers branch on Platform.OS and fall
 * back to the browser's native `window.alert` / `window.confirm` on web.
 *
 * Always use these instead of importing `Alert` directly in screens.
 */

import { Alert, Platform } from 'react-native';

function joinText(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

/** Informational dialog with a single dismiss button. */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    window.alert(joinText(title, message));
    return;
  }
  Alert.alert(title, message);
}

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Renders the confirm button in a destructive style on native. */
  destructive?: boolean;
}

/** Yes/no confirmation. Resolves true when the user confirms. */
export function showConfirm(opts: ConfirmOptions): Promise<boolean> {
  const {
    title,
    message,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
    destructive = false,
  } = opts;

  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(joinText(title, message)));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
