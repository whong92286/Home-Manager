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
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID",
};
