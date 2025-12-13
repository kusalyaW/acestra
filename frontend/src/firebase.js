import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'

// Read Firebase Web config from Vite env variables prefixed with VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  // Optional: explicit Realtime Database URL (e.g. https://<project>-default-rtdb.firebaseio.com)
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

let app
try {
  app = initializeApp(firebaseConfig)
} catch (e) {
  // initialization can throw if re-run in dev HMR; ignore
}

// Export Firestore (if you still need it) and Realtime Database client
export const db = getFirestore(app)
export const rtdb = getDatabase(app)
