
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, type Auth, type ConfirmationResult } from "firebase/auth";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export const sendPhoneOtp = (auth: Auth, phoneNumber: string, onStateChange?: (message: string) => void): Promise<ConfirmationResult> => {
  return new Promise((resolve, reject) => {
    onStateChange?.("Initializing reCAPTCHA...");
    
    // Clear any existing reCAPTCHA
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.log("Clearing old recaptcha");
      }
      delete window.recaptchaVerifier;
    }

    // Ensure we have a valid container
    let recaptchaContainer = document.getElementById('recaptcha-container');
    if (!recaptchaContainer) {
      recaptchaContainer = document.createElement('div');
      recaptchaContainer.id = 'recaptcha-container';
      recaptchaContainer.style.display = 'none';
      document.body.appendChild(recaptchaContainer);
    }

    // Create a new verifier
    try {
      const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
          onStateChange?.("reCAPTCHA solved. Sending OTP...");
        },
        'expired-callback': () => {
          onStateChange?.("reCAPTCHA expired. Please try again.");
          reject(new Error("reCAPTCHA verification expired. Please try sending the code again."));
        },
        'error-callback': (error: any) => {
          onStateChange?.(`reCAPTCHA error: ${error?.message || 'Unknown error'}`);
          reject(new Error(`reCAPTCHA error: ${error?.message || 'Please refresh the page and try again.'}`));
        }
      });
      
      window.recaptchaVerifier = appVerifier;
      
      onStateChange?.("Sending OTP request to Firebase...");
      
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error("OTP request timed out. Please try again."));
      }, 30000);
      
      signInWithPhoneNumber(auth, phoneNumber, appVerifier)
        .then((confirmationResult) => {
          clearTimeout(timeout);
          onStateChange?.("OTP sent successfully from Firebase.");
          window.confirmationResult = confirmationResult;
          resolve(confirmationResult);
        })
        .catch((error) => {
          clearTimeout(timeout);
          onStateChange?.(`Firebase OTP error: ${error.code} - ${error.message}`);
          
          // Handle specific Firebase errors
          let friendlyMessage = "Failed to send OTP. Please check your network and try again.";
          
          if (error.code === 'auth/invalid-phone-number') {
            friendlyMessage = "The phone number format is invalid. Please check and try again.";
          } else if (error.code === 'auth/too-many-requests') {
            friendlyMessage = "Too many attempts. Please try again later.";
          } else if (error.code === 'auth/quota-exceeded') {
            friendlyMessage = "SMS quota exceeded. Please try again later.";
          } else if (error.code === 'auth/captcha-check-failed') {
            friendlyMessage = "reCAPTCHA verification failed. Please refresh the page and try again.";
          } else if (error.code === 'auth/app-not-authorized') {
            friendlyMessage = "App not authorized for Firebase phone authentication. Contact support.";
          } else if (error.code === 'auth/user-disabled') {
            friendlyMessage = "This account has been disabled.";
          } else if (error.code === 'auth/operation-not-allowed') {
            friendlyMessage = "Phone authentication is not enabled for this app.";
          } else if (error.message.includes('-39') || error.code === 'auth/invalid-app-credential') {
            friendlyMessage = "Authentication configuration issue. Please try again or contact support.";
          }
          
          // Clean up on error
          if (window.recaptchaVerifier) {
            try {
              window.recaptchaVerifier.clear();
            } catch (e) {
              // Ignore cleanup errors
            }
            delete window.recaptchaVerifier;
          }
          
          reject(new Error(friendlyMessage));
        });
        
    } catch (error: any) {
      onStateChange?.(`reCAPTCHA initialization error: ${error.message}`);
      reject(new Error("Failed to initialize verification. Please refresh the page."));
    }
  });
};
