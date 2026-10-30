# Firebase setup — Classroom Pro v5

Follow these steps once. After a student or teacher registers, they should use **Sign in** next time; do not register again with the same email.

## 1. Create/open your Firebase project
1. Go to https://console.firebase.google.com/ and open your project (or choose **Add project**).
2. Click the gear ⚙️ → **Project settings** → **General**.
3. Under **Your apps**, click the Web icon `</>` if no web app exists. Give it a name such as `Classroom Pro` and register it. Hosting setup can be skipped for now.

## 2. Copy the web config
1. In the Web app's **SDK setup and configuration**, choose **Config**.
2. Open `public/js/config.js` in this project.
3. Replace the placeholder values with the matching values from Firebase. Keep the property names and quotes. Do not paste a service-account JSON/private key here.

## 3. Turn on email/password login
Firebase Console → **Build → Authentication → Get started** → **Sign-in method** → **Email/Password** → Enable → Save.

## 4. Create Firestore
Firebase Console → **Build → Firestore Database → Create database**. Choose a region near your users. After creation, return to the project folder and deploy the included rules (step 6); do not leave a permissive test rule in place.

## 5. Allow local testing
For local development, use a local web server rather than double-clicking HTML files. Add `localhost` and `127.0.0.1` under **Authentication → Settings → Authorized domains** if they are not already listed.

## 6. Deploy rules and hosting (optional until you're ready)
Install Node.js LTS, then open a terminal in the folder containing `firebase.json` and run:

```bash
npx firebase-tools login
npx firebase-tools use --add
npx firebase-tools deploy
```

When `use --add` asks, select your project and choose `default` as the alias. This writes the correct project ID into `.firebaserc`. If you already know the exact project ID, you can replace `YOUR_PROJECT_ID` in `.firebaserc` manually, then run `npx firebase-tools deploy`.

To run locally without deploying:

```bash
npx serve public
```

Open the local URL printed in the terminal.

## 7. First test
1. Open Register and create one test student account.
2. Sign out, then use Sign in with the same email/password. This is the normal flow after the first registration.
3. Register a separate teacher test account to test scheduling and announcements.

## Common errors
- **Firebase is not configured**: one or more placeholders remain in `public/js/config.js`.
- **auth/operation-not-allowed**: enable Email/Password in Authentication.
- **auth/unauthorized-domain**: add the current host under Authentication → Settings → Authorized domains.
- **permission-denied**: make sure Firestore exists and run `npx firebase-tools deploy --only firestore:rules` from the project folder.
- **Missing or insufficient permissions**: check that the signed-in user's `users/{uid}` profile exists and that the rules from this project were deployed.
- **Already registered**: use Sign in or Forgot password; do not create another account for the same email.

## Security note
The Firebase web config identifies your app; it is not a service-account private key. Never share your Google password or a service-account private key. Firestore security rules are essential. Teacher self-registration is currently open, so use this only for a prototype unless you add a teacher invitation/admin approval workflow.
