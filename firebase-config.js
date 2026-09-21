// Firebase project settings for Home Manager.
//
// These values identify which Firebase project the app talks to. They are
// NOT secrets — Firebase's client config is meant to be public in web apps
// (this is safe to commit to a public repo). Real access control happens in
// two other places: Firebase Authentication (who can sign in) and Firestore
// Security Rules (which signed-in accounts can read/write data). See
// README.md for how to set both of those up.
//
// Get these values from: Firebase Console -> Project settings (gear icon)
// -> General tab -> "Your apps" -> the web app's config snippet.
export const firebaseConfig = {
  apiKey: "AIzaSyDnK6AppJ5QMY7ZsdotvOVjDMCIo6x4cxA",
  authDomain: "home-manager-550e9.firebaseapp.com",
  projectId: "home-manager-550e9",
  storageBucket: "home-manager-550e9.firebasestorage.app",
  messagingSenderId: "291004482783",
  appId: "1:291004482783:web:aced25a2850c0023dd556a",
};
