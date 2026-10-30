# Classroom Pro v5

A responsive student/teacher timetable app built with plain HTML, CSS, JavaScript modules, Firebase Authentication, Firestore, and Firebase Hosting. No bundler is required.

## Included features
- Register once as a student or teacher, then sign in on future visits
- Role-aware dashboards and sign-out
- Student: next class, weekly timetable, announcements, profile, timetable search, CSV export, print view
- Teacher: create/edit/delete classes, room/teacher/student-group clash checks, course catalog, audience-based announcements, announcement search, CSV export
- Password reset, friendly Firebase error messages, Firestore rules and indexes
- Responsive layout and beginner-focused Firebase setup instructions

## Start here
1. Read **FIREBASE-SETUP.md**.
2. Replace placeholder values in `public/js/config.js` with your Firebase Web app config.
3. Enable Email/Password in Firebase Authentication and create a Firestore database.
4. Run locally with `npx serve public` or VS Code Live Server.
5. When ready, run `npx firebase-tools login`, `npx firebase-tools use --add`, then `npx firebase-tools deploy` from this folder.

**Important:** This ZIP is prepared for your Firebase project but is not connected or deployed automatically. You must use your own project config and Firebase account. Do not share your Google password or service-account private key.
