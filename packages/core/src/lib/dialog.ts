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

export interface ConfirmOptions {
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

export interface DialogAction {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

/**
 * Multi-option action sheet. On native uses Alert with buttons; on web it
 * asks the user to confirm each non-cancel action in order and runs the first
 * one accepted.
 */
export function showActionSheet(
  title: string,
  message: string | undefined,
  actions: DialogAction[]
): void {
  if (Platform.OS === 'web') {
    for (const action of actions) {
      if (action.style === 'cancel') continue;
      if (window.confirm(joinText(`${title} — ${action.text}`, message))) {
        action.onPress?.();
        return;
      }
    }
    return;
  }
  Alert.alert(title, message, actions);
}
