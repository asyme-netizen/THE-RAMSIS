// 1) Go to Firebase Console > Project settings > General > Your apps
// 2) Copy your Firebase web app config and paste it below
// 3) In Firebase Authentication, enable: Google and Email/Password
// 4) In Authentication > Settings > Authorized domains, add your GitHub Pages domain

export const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_MESSAGING_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};
