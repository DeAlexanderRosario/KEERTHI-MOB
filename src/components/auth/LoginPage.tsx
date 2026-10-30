import React from 'react';
import { KeerthiAuthFlow } from './KeerthiAuthFlow';

interface LoginPageProps {
  onSuccess: () => void;
  onContinueGuest?: () => void;
}

export function LoginPage({ onSuccess, onContinueGuest }: LoginPageProps) {
  return (
    <KeerthiAuthFlow
      onSuccess={onSuccess}
      onExploreAsGuest={onContinueGuest}
    />
  );
}
