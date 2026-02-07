import { Auth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

/**
 * Initializes a reCAPTCHA verifier and sends a verification code to the provided phone number.
 * @param auth The Firebase Auth instance.
 * @param phoneNumber The phone number in E.164 format.
 * @param log A function to log debug messages.
 * @returns A promise that resolves with the ConfirmationResult.
 */
export const sendPhoneOtp = (auth: Auth, phoneNumber: string, log: (message: string) => void): Promise<ConfirmationResult> => {
  log("Util Step A: Creating new RecaptchaVerifier instance.");
  // A new reCAPTCHA verifier is created for each request to ensure it's fresh.
  // It relies on a 'recaptcha-container' div being present in the DOM.
  const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    'size': 'invisible',
    'callback': (response: any) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
      log("Util Step B: reCAPTCHA solved by user.");
    },
    'expired-callback': () => {
      // Response expired. Ask user to solve reCAPTCHA again.
      log("Util Step B (Error): reCAPTCHA expired. User must retry.");
    }
  });
  
  log("Util Step C: Calling signInWithPhoneNumber.");
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
};
