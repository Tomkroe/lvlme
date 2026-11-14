/** „Mit Apple anmelden“-Knopf im offiziellen Apple-Stil (nur iPhone). Im Web gilt AppleButton.web.tsx. */
import React from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';

export function AppleButton({ onPress }: { onPress: () => void }) {
  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
      cornerRadius={14}
      style={{ height: 48, width: '100%' }}
      onPress={onPress}
    />
  );
}
