'use client';

import { FirebaseProvider, FirebaseProviderProps } from './provider';

// This provider ensures that Firebase is only initialized on the client side.
export function FirebaseClientProvider({ children, ...props }: FirebaseProviderProps) {
  return (
    <FirebaseProvider {...props}>
      {children}
    </FirebaseProvider>
  );
}
