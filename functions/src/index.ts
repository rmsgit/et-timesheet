import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({maxInstances: 10});

export const resetUserPassword = onCall({cors: true}, async (request) => {
  // 1. Verify Authentication
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const callerUid = request.auth.uid;
  const {targetUid, newPassword} = request.data;

  if (!targetUid || !newPassword) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with targetUid and newPassword."
    );
  }

  if (newPassword.length < 6) {
    throw new HttpsError(
      "invalid-argument",
      "Password must be at least 6 characters long."
    );
  }

  try {
    // 2. Verify Authorization (Check if caller is super admin in RTDB)
    const callerRef = admin.database().ref(`users/${callerUid}`);
    const callerSnapshot = await callerRef.get();

    if (!callerSnapshot.exists() ||
        callerSnapshot.val().role !== "super admin") {
      throw new HttpsError(
        "permission-denied",
        "Only super admins can reset user passwords directly."
      );
    }

    // 3. Update Password in Firebase Auth
    await admin.auth().updateUser(targetUid, {
      password: newPassword,
    });

    return {success: true, message: "Password updated successfully."};
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Error resetting password:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    throw new HttpsError(
      "internal",
      "An error occurred while resetting the password.",
      message
    );
  }
});
