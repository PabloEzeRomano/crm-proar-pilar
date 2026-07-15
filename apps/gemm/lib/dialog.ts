import { Alert, Platform } from 'react-native';

function joinText(title: string, message?: string): string {
  return message ? `${title}\n\n${message}` : title;
}

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
  destructive?: boolean;
}

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
