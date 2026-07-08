import admin from 'firebase-admin';

// Initialise Firebase Admin from environment variables.
// If credentials are missing we still start the server, but token
// verification will fail — handy while wiring things up locally.
let initialised = false;

export function initFirebase() {
  if (initialised) return;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('⚠ Firebase Admin not configured — set FIREBASE_* vars in .env to enable auth.');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // Private key comes with escaped newlines in .env — restore them.
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  initialised = true;
  console.log('✓ Firebase Admin initialised');
}

export { admin };
