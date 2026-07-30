# Deployment

This app deploys as:

- Frontend: Vite React static build
- Backend: Firebase Authentication and Cloud Firestore
- Security: Firestore rules in `firestore.rules`

## 1. Firebase Project

Create or open a Firebase project, then enable:

- Authentication -> Sign-in method -> Email/Password
- Firestore Database -> Native mode
- Hosting

## 2. Environment Variables

Copy `.env.example` to `.env` locally and fill it with the Firebase web app config.

For production hosting outside Firebase, add the same variables in that platform's environment settings:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## 3. Verify Locally

```bash
npm install
npm run typecheck
npm run build
npm run preview
```

## 4. Deploy Backend Rules

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

## 5. Deploy Frontend to Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

## 6. First Admin User

Create the first admin account in the app. If the created profile is not an admin, update the matching document in Firestore:

Collection: `users`

Field:

```json
{
  "role": "admin",
  "is_active": true
}
```

## 7. Production Checklist

- `.env` is not committed
- Firebase Email/Password auth is enabled
- Firestore rules are deployed
- Firebase Hosting shows the latest build
- App routes refresh correctly, for example `/students` and `/meetings`
- You can sign in, create an inquiry, create a student, and create a meeting
