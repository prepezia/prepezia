import { Auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

/**
 * Initializes a reCAPTCHA verifier and sends a verification code to the provided phone number.
 * @param auth The Firebase Auth instance.
 * @param phoneNumber The phone number in E.164 format.
 * @returns A promise that resolves with the ConfirmationResult.
 */
export const sendPhoneOtp = (auth: Auth, phoneNumber: string): Promise<ConfirmationResult> => {
  // A new reCAPTCHA verifier is created for each request to ensure it's fresh.
  // It relies on a 'recaptcha-container' div being present in the DOM.
  const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible'
  });

  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};
