'use client';

import { FirebaseProvider, FirebaseProviderProps } from './provider';

// This provider ensures that Firebase is only initialized on the client side.
export function FirebaseClientProvider({ children, ...props }: FirebaseProviderProps) {
  if (typeof window === 'undefined') {
    return null;
  }

  return (
    <FirebaseProvider {...props}>
      {children}
    </FirebaseProvider>
  );
}
