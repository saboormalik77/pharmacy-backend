/**
 * Firebase Service for Push Notifications
 * Based on gift-backend implementation
 */

import * as admin from 'firebase-admin';

let firebaseApp: admin.app.App | null = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
export const initializeFirebase = (): void => {
  if (isInitialized) {
    return;
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID || 'pharmacy-d6fe2',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.warn('⚠️ Firebase credentials not found. Push notifications will be disabled.');
      console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env');
      return;
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });

    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error: any) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
  }
};

/**
 * Send push notification to a single device
 */
export const sendPushNotification = async (
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> => {
  if (!firebaseApp) {
    console.warn('⚠️ Firebase not initialized. Cannot send push notification.');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        notification: {
          channelId: 'default',
          priority: 'high' as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Push notification sent successfully: ${response}`);
    return true;
  } catch (error: any) {
    console.error('❌ Failed to send push notification:', error.message);
    return false;
  }
};

/**
 * Send push notification to multiple devices
 */
export const sendPushNotificationToMultiple = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> => {
  if (!firebaseApp) {
    console.warn('⚠️ Firebase not initialized. Cannot send push notifications.');
    return { successCount: 0, failureCount: tokens.length };
  }

  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: data || {},
      android: {
        notification: {
          channelId: 'default',
          priority: 'high' as const,
          defaultSound: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(
      `📱 Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`
    );

    // Log failed tokens for debugging
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Failed to send to token ${tokens[idx]}: ${resp.error?.message}`);
        }
      });
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (error: any) {
    console.error('❌ Failed to send push notifications:', error.message);
    return { successCount: 0, failureCount: tokens.length };
  }
};

/**
 * Validate FCM token
 */
export const validateFcmToken = async (token: string): Promise<boolean> => {
  if (!firebaseApp) {
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token,
      notification: {
        title: 'Test',
        body: 'Test',
      },
    };

    await admin.messaging().send(message, true); // dry-run = true
    return true;
  } catch (error: any) {
    console.debug(`Invalid FCM token: ${error.message}`);
    return false;
  }
};

/**
 * Check if Firebase is initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return isInitialized && firebaseApp !== null;
};

