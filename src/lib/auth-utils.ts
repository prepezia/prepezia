
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";

// Store the verifier on the window object to prevent it from being re-created on re-renders
// which is a common cause of reCAPTCHA errors in React.
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export const sendPhoneOtp = (auth: Auth, phoneNumber: string, onStateChange: (message: string) => void): Promise<ConfirmationResult> => {
  return new Promise((resolve, reject) => {
    onStateChange("Initializing reCAPTCHA...");
    
    // If a container element doesn't exist, create it.
    let recaptchaContainer = document.getElementById('recaptcha-container');
    if (!recaptchaContainer) {
      recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container';
      document.body.appendChild(recaptchaContainer);
    }

    // Use existing verifier if available, otherwise create a new one.
    // The verifier is attached to the window object to persist across renders.
    if (window.recaptchaVerifier instanceof RecaptchaVerifier) {
      window.recaptchaVerifier.clear();
    }

    const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible',
      'callback': (response: any) => {
        onStateChange("reCAPTCHA solved. Sending OTP...");
      },
      'expired-callback': () => {
        onStateChange("reCAPTCHA expired. Please try again.");
        reject(new Error("reCAPTCHA verification expired. Please try sending the code again."));
      },
      'error-callback': (error: any) => {
        onStateChange(`reCAPTCHA error: ${error?.message || 'Unknown error'}`);
        reject(error);
      }
    });
    
    window.recaptchaVerifier = appVerifier;
    
    onStateChange("Sending OTP request to Firebase...");
    signInWithPhoneNumber(auth, phoneNumber, appVerifier)
      .then((confirmationResult) => {
        onStateChange("OTP sent successfully from Firebase.");
        resolve(confirmationResult);
      })
      .catch((error) => {
        onStateChange(`Firebase OTP error: ${error.code} - ${error.message}`);
        
        let friendlyMessage = "Failed to send OTP. Please check your network and try again.";
        if (error.code === 'auth/invalid-phone-number') {
            friendlyMessage = "The phone number is not valid. Please check the format.";
        } else if (error.code === 'auth/too-many-requests') {
            friendlyMessage = "You've made too many requests. Please try again later.";
        }
        error.message = friendlyMessage;
        reject(error);
      });
  });
};
