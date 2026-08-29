'use client';

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginScreen } from './LoginScreen';

/**
 * Shows the dashboard only once someone has signed in.
 *
 * Sits inside the providers but outside the chrome, so the login screen
 * renders on its own without the navbar and sidebar around it.
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isReady } = useAuth();

  // Until the stored session has been read, render nothing rather than
  // flashing the login screen at someone who is already signed in.
  if (!isReady) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (!user) return <LoginScreen />;

  return <>{children}</>;
};
