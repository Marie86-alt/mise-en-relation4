/* eslint-disable import/namespace */
// ↑ On coupe la règle qui croit à tort que `region` n'existe pas en v1

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();
const auth = admin.auth();

/**
 * 1) Crée automatiquement users/{uid} quand un compte est créé dans Authentication
 */
export const onAuthUserCreate = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user: admin.auth.UserRecord) => {
    const ref = db.doc(`users/${user.uid}`);
    await ref.set(
      {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
        role: 'user',
        isVerified: false,
        isSuspended: false,
        isDeleted: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

/**
 * 2) Suppression complète d'un utilisateur (réservé aux admins)
 * Appel côté client :
 *   const fn = httpsCallable(getFunctions(undefined, 'europe-west1'), 'adminDeleteUser');
 *   await fn({ uid: 'UID_A_SUPPRIMER' });
 */
export const adminDeleteUser = functions
  .region('europe-west1')
  .https.onCall(async (data: any, context: functions.https.CallableContext) => {
    const callerUid = context.auth?.uid;
    if (!callerUid) {
      throw new functions.https.HttpsError('unauthenticated', 'Non authentifié.');
    }

    // Vérifier rôle admin
    const callerDoc = await db.doc(`users/${callerUid}`).get();
    if (!callerDoc.exists || callerDoc.get('role') !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Réservé aux administrateurs.');
    }

    const targetUid: string | undefined = data?.uid;
    if (!targetUid) {
      throw new functions.https.HttpsError('invalid-argument', "Paramètre 'uid' manquant.");
    }
    if (targetUid === callerUid) {
      throw new functions.https.HttpsError('failed-precondition', "Un admin ne peut pas se supprimer lui-même.");
    }

    // Retirer l'utilisateur des conversations
    const convSnap = await db
      .collection('conversations')
      .where('participants', 'array-contains', targetUid)
      .get();

    const batch = db.batch();
    convSnap.forEach((docSnap) => {
      batch.update(docSnap.ref, {
        participants: admin.firestore.FieldValue.arrayRemove(targetUid),
        [`participantDetails.${targetUid}`]: admin.firestore.FieldValue.delete(),
        removedUsers: admin.firestore.FieldValue.arrayUnion(targetUid),
      });
    });

    // Supprimer le document utilisateur
    batch.delete(db.doc(`users/${targetUid}`));
    await batch.commit();

    // Supprimer le compte Authentication
    await auth.deleteUser(targetUid);

    return { ok: true, removed: targetUid, affectedConversations: convSnap.size };
  });
