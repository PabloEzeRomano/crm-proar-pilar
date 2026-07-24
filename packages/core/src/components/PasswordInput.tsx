/**
 * PasswordInput — TextInput with a show/hide toggle.
 *
 * Owns the visibility state and the eye affordance only. Visual styling stays
 * with the caller: whatever `style` you pass is applied to the input, and the
 * layout rules this component needs (flex, room for the icon) are applied on
 * top so the toggle never overlaps the text.
 */

import { forwardRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../theme';

export interface PasswordInputProps extends Omit<TextInputProps, 'secureTextEntry'> {
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  iconSize?: number;
}

const PasswordInput = forwardRef<TextInput, PasswordInputProps>(
  function PasswordInput({ containerStyle, style, iconSize = 24, ...inputProps }, ref) {
    const { colors, spacing } = useTheme();
    const [visible, setVisible] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        <TextInput
          ref={ref}
          autoCapitalize="none"
          autoCorrect={false}
          {...inputProps}
          style={[style, styles.input]}
          secureTextEntry={!visible}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={[styles.toggle, { right: spacing[3], padding: spacing[2] }]}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          hitSlop={8}
        >
          <MaterialCommunityIcons
            name={visible ? 'eye-off' : 'eye'}
            size={iconSize}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    paddingRight: 48,
  },
  toggle: {
    position: 'absolute',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PasswordInput;
