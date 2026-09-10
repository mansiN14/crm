# Deployment

This app deploys as:

- Frontend: Vite React static build
- Backend: Firebase Authentication and Cloud Firestore
- Automation backend: Firebase Cloud Functions in `functions/`
- Security: Firestore rules in `firestore.rules`

Production site: https://true-axis-crm.web.app (Firebase project `true-axis-crm`).
The frontend and Firestore rules were published on 2026-09-10. The Attendez
Cloud Functions are not deployed: sending and webhook mapping still require
the provider's API contract and server-side configuration.

For subsequent frontend/rules releases, run the local checks below, build, and
run `firebase deploy --only "hosting,firestore:rules" --project true-axis-crm`.
Commit and push each release to `origin/main`; a Git push alone does not
publish Firebase Hosting in this repository.

## Website inquiry integration

Both `https://thetrueaxis.in/contact` and `/book-consultation` submit through
the website's `/api/create-inquiry` endpoint. It authenticates with the dedicated
Firebase user `websiteinquiries@thetrueaxis.in` (UID
`XCr35hPAcySp0KRA4ZyKmSSa3Nf1`). Firestore rules allow that identity to create
validated website inquiries and activity logs, including their document IDs.
It has no permission to read, update, or delete CRM inquiries. Do not replace
this integration permission with public writes or a CRM administrator role.

After changing these rules, verify the website endpoint returns success and
that both the inquiry and its activity log exist. Use synthetic test details
and remove the test records afterward.

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

Firebase Functions also need server-side Attendez configuration. Do not add these as `VITE_*` values and do not commit real secrets:

- `ATTENDEZ_API_URL`
- `ATTENDEZ_API_KEY`
- `ATTENDEZ_TEMPLATE_NAME`
- `ATTENDEZ_TEMPLATE_BUSINESS_JATRA_STUDENT`
- `ATTENDEZ_TEMPLATE_BUSINESS_JATRA_PARENT`
- `ATTENDEZ_TEMPLATE_BUSINESS_JATRA_BUSINESS`
- `ATTENDEZ_PHONE_NUMBER_ID`
- `ATTENDEZ_WEBHOOK_SECRET`

## 3. Verify Locally

```bash
npm install
npm --prefix functions install
npm run typecheck
npm --prefix functions test
npm run build
npm run preview
```

## 4. Deploy Backend Rules

```bash
firebase login
firebase use --add
firebase deploy --only firestore:rules
```

## 4a. Deploy Cloud Functions

After Attendez provides the final API contract and `functions/src/services/attendezService.ts` is completed:

```bash
npm --prefix functions install
npm --prefix functions test
firebase deploy --only functions
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
