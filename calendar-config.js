// Google Calendar sync configuration.
//
// This is a Google OAuth 2.0 Web Client ID, obtained from Google Cloud Console
// (APIs & Services -> Credentials). It is NOT secret -- OAuth client IDs for
// browser-based apps are meant to be public, same as the Firebase config in
// firebase-config.js. What actually protects access is: (1) this client ID is
// only authorized to run from your app's exact domain (set when you create it),
// and (2) your Google Cloud project's OAuth consent screen only allows specific
// approved test users (you and your family) to grant it access at all.
//
// See README.md's "Google Calendar sync" section for how to get this value.
export const googleClientId = "REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID";
