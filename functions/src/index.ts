import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK for backend processes
if (admin.apps.length === 0) {
  admin.initializeApp();
}

/**
 * Production Health-Check/Ping Endpoint
 * Used by external monitors or status badges to verify backend functional integrity.
 */
export const health = onRequest({ cors: true }, (request, response) => {
  response.status(200).json({
    status: "healthy",
    message: "FarmFresh Hub Production Cloud Functions are fully operational!",
    timestamp: new Date().toISOString()
  });
});
