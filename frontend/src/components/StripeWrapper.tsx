// src/components/StripeWrapper.tsx
import React from 'react';
import { Platform } from 'react-native';

// Import conditionnel de Stripe - seulement sur natif
let StripeProvider: any = ({ children }: { children: React.ReactNode }) => <>{children}</>;

if (Platform.OS !== 'web') {
  try {
    const stripe = require('@stripe/stripe-react-native');
    StripeProvider = stripe.StripeProvider;
  } catch (e) {
    console.warn('Stripe not available');
  }
}

interface StripeWrapperProps {
  publishableKey: string;
  children: React.ReactNode;
}

export const StripeWrapper: React.FC<StripeWrapperProps> = ({ publishableKey, children }) => {
  if (Platform.OS === 'web') {
    // Sur web, ne pas utiliser Stripe Provider
    return <>{children}</>;
  }

  return <StripeProvider publishableKey={publishableKey}>{children}</StripeProvider>;
};
