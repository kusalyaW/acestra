# Acetra Frontend (Vite + React)

This folder contains a minimal React app (Vite) that reads documents from a Firebase Firestore collection and displays them.

Setup
1. Create a Firebase Web App in your Firebase project (Console → Project settings → Add app → Web). Copy the Web app config values (apiKey, authDomain, projectId, etc.). Do NOT use the admin service account JSON directly in the frontend.

2. In `frontend/`, create a `.env` or `.env.local` file with the keys from `.env.example` filled in. Example keys you need:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=1:xxx:web:yyy
VITE_FIREBASE_COLLECTION=acetra
```

3. Install and run (PowerShell):

```powershell
cd "e:\new downloads\acetra project\acetra project\frontend"
npm install
npm run dev
```

4. Open the dev URL shown by Vite (usually `http://localhost:5173`).

Notes
- The repository contains `acetra-a4458-firebase-adminsdk-fbsvc-5e01b2aec4.json` which is a Firebase Admin service account. That file is for server/admin use only and must NOT be embedded in frontend code.
- The app reads from the Firestore collection name in `VITE_FIREBASE_COLLECTION` (defaults to `acetra`). Ensure your Firestore rules allow reads from the frontend, or set up authentication.

If you want, I can:
- Add authentication (Google sign-in) and restrict reads to signed-in users.
- Change fetching to Realtime Database instead of Firestore.
- Add filtering, pagination, or a nicer UI.
