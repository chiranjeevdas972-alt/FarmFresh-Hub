import emailjs from "@emailjs/browser";
import { db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc,
  increment
} from 'firebase/firestore';

const SERVICE_ID = "service_4qmtlo8";
const TEMPLATE_ID = "template_w9uy2cu";
const PUBLIC_KEY = "v6JcNvS762oti3009";

// Initialize EmailJS
if (typeof window !== 'undefined') {
  emailjs.init(PUBLIC_KEY);
}

export const sendOTPEmail = async (email: string, otp: string) => {
  try {
    console.log("START EMAIL SEND TO:", email);

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: email,
        otp: otp,
      },
      PUBLIC_KEY
    );

    console.log("EMAIL SUCCESS", response);

    return {
      success: true,
      response,
    };

  } catch (error) {
    console.error("EMAIL FAILED", error);

    return {
      success: false,
      error,
    };
  }
};

export const otpService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async sendOTP(email: string, otp: string) {
    return await sendOTPEmail(email, otp);
  },

  async saveOTP(email: string, otp: string) {
    try {
      const { Timestamp } = await import('firebase/firestore');
      const otpData = {
        otp: otp,
        createdAt: Timestamp.now(),
        verified: false
      };

      await setDoc(doc(db, 'otp_verification', email), otpData);
      console.log('OTP saved successfully for:', email);
    } catch (error: any) {
      console.error("Firestore Error saving OTP:", error);
      const { handleFirestoreError, OperationType } = await import('../lib/firebase');
      handleFirestoreError(error, OperationType.WRITE, `otp_verification/${email}`);
    }
  },

  async verifyOTP(email: string, enteredOtp: string): Promise<{ success: boolean; message: string }> {
    if (!email) {
      return { success: false, message: 'Email is required for verification.' };
    }
    try {
      const otpDocRef = doc(db, 'otp_verification', email);
      const otpDoc = await getDoc(otpDocRef);

      if (!otpDoc.exists()) {
        return { success: false, message: 'OTP not found' };
      }

      const data = otpDoc.data();
      const { Timestamp } = await import('firebase/firestore');
      const createdAt = (data.createdAt as any).toMillis();
      const now = Date.now();
      
      // 60 seconds expiry check
      if (now - createdAt > 60000) {
        return { success: false, message: 'OTP expired' };
      }

      if (data.otp === enteredOtp) {
        // Success
        await updateDoc(otpDocRef, {
          verified: true
        });
        
        return { success: true, message: 'Welcome to Farm Fresh Hub 🎉' };
      } else {
        return { success: false, message: 'Invalid OTP' };
      }
    } catch (error: any) {
      console.error('Verification failed:', error);
      return { 
        success: false, 
        message: 'Verification failed' 
      };
    }
  }
};
