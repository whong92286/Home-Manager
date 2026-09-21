# Home Manager

A simple family dashboard to help run daily household life: shared chores,
a family calendar, a shopping list, and an optional live view of your
[Home Assistant](https://www.home-assistant.io/) smart-home devices.

It's a plain HTML/CSS/JavaScript app — no build tools, no custom server to
run. Data is shared and synced live between family members using
[Firebase](https://firebase.google.com/) (Google's free app backend), and
only Google accounts you approve can sign in and see it.

## Features

- **Dashboard** — at-a-glance view of open chores, upcoming events, and your shopping list
- **Chores** — add tasks, assign them to a family member, set a due date, check them off
- **Calendar** — a simple list of upcoming family events
- **Shopping List** — a shared list you can check items off as you shop
- **Smart Home** — optionally connect to a Home Assistant instance to see live device states (lights, sensors, thermostats, etc.)
- **Settings** — manage family members and connection details
- **Live sync + sign-in** — everyone in the family sees the same data update in real time, and only Google accounts you've approved can get in

## One-time setup: create your Firebase project

This app needs a Firebase project to store data and handle sign-in. It's free
for a household's worth of use. This takes about 10 minutes and you only do
it once.

1. Go to [console.firebase.google.com](https://console.firebase.google.com/)
   and sign in with your Google account.
2. Click **Add project**, name it (e.g. "Home Manager"), and finish the
   wizard (you can disable Google Analytics for this project — not needed).
3. **Enable Google sign-in:** In your new project, go to **Build → Authentication**
   → **Get started** → under "Sign-in method," choose **Google** → **Enable** → **Save**.
4. **Create the database:** Go to **Build → Firestore Database** → **Create database**
   → choose a location close to you → start in **production mode** → **Enable**.
5. **Lock the database down to your family:** In Firestore, click the **Rules** tab
   and replace the contents with the following (swap in your and your family's
   actual Google account emails):

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /households/main {
         allow read, write: if request.auth != null &&
           request.auth.token.email in [
             "you@gmail.com",
             "your.wife@gmail.com"
           ];
       }
     }
   }
   ```

   Click **Publish**. Now only those two accounts can read or write the shared
   data — anyone else who signs in gets rejected, even though the app itself is public.

6. **Get your app's config:** Go to **Project settings** (gear icon, top left)
   → scroll to "Your apps" → click the **web icon (`</>`)** → register the app
   (any nickname) → you don't need Firebase Hosting → copy the `firebaseConfig`
   object it shows you.
7. Open `firebase-config.js` in this repo and paste your real values in place
   of the `REPLACE_WITH_...` placeholders. These values are not secret — they're
   safe to commit and push, since the Rules from step 5 are what actually protect
   your data.
Once that's done, commit and push `firebase-config.js`. The remaining step —
deploying the app — is covered below under **Firebase Hosting**.

## Try it locally

1. Download or clone this repository and complete the Firebase setup above.
2. Because the app uses JavaScript modules, opening `index.html` directly from
   disk won't work in all browsers — instead run a tiny local server from this
   folder, e.g. `python3 -m http.server 8000`, then visit `http://localhost:8000`.
3. Sign in with an approved Google account and start adding chores, events, and shopping items.

## Publish it for free with Firebase Hosting

This is the real family dashboard link — it's hosted on the same Firebase
project as your sign-in and database, which avoids sign-in problems that
happen when the app and the login system live on different websites.

This is a one-time setup on your own computer (it needs your Google login in
a real browser, which isn't something that can be done remotely for you).

1. **Install Node.js** if you don't already have it: download the installer
   from [nodejs.org](https://nodejs.org/) (choose the "LTS" version) and run it.
2. **Get a local copy of this repo.** If you don't already have one, open a
   terminal (Command Prompt / Terminal app) and run:
   ```
   git clone https://github.com/whong92286/Home-Manager.git
   cd Home-Manager
   ```
   If you already have a local copy, just `cd` into it and run `git pull`.
3. **Install the Firebase CLI** (a one-time global install):
   ```
   npm install -g firebase-tools
   ```
4. **Log in to Firebase** (this opens a browser window to sign in with the
   Google account that owns the `home-manager-550e9` project):
   ```
   firebase login
   ```
5. **Deploy:**
   ```
   firebase deploy --only hosting
   ```
   This repo already includes the `firebase.json` / `.firebaserc` config
   files it needs — you don't need to run `firebase init`.
6. When it finishes, it prints a **Hosting URL** like
   `https://home-manager-550e9.web.app` — that's your family's real dashboard
   link going forward. Share that link (not the GitHub Pages one) with your family.

**Whenever you or I change the app's code**, just re-run `firebase deploy --only hosting`
from this folder (after `git pull`) to push the update live. If you'd like this
to happen automatically whenever code is pushed to GitHub instead of running it
by hand each time, run `firebase init hosting:github` instead of step 5 above —
it walks you through connecting this GitHub repo so every push to `main` deploys
automatically.

## How your data is stored and protected

- All chores, events, shopping items, and settings live in one shared Firestore
  document, synced live to every signed-in device — add a chore on your phone,
  it appears on your wife's phone within a second or two.
- **Only Google accounts listed in your Firestore security rules (step 5 above)
  can read or write that data.** Anyone else who opens the site can try to sign
  in, but Firestore will reject their requests — they will not see your family's
  data.
- The web page itself is still publicly reachable (see the Firebase Hosting
  section below) — what's actually locked down is the *data*, via Firebase
  Auth + Rules, not the page's HTML/CSS/JS, which is normal and fine for a
  client-side app.

You can use **Settings → Export data** any time to download a backup as JSON.

## Google Calendar sync (optional)

Two-way sync between the Calendar tab and a shared Google Calendar: events you
add here appear on that calendar, and anything already on it (work events,
vacations, birthdays, etc.) appears here too. Because this app has no backend
server, syncing only happens while someone has the app open in a browser tab
(on load, every 5 minutes automatically, and via the "Sync now" button) —
changes don't sync instantly if nobody has it open.

### One-time setup (in Google Cloud Console)

This app's Firebase project is also a Google Cloud project, so this all
happens in the same project as your Firebase setup.

1. Go to [console.cloud.google.com](https://console.cloud.google.com/) and
   make sure the `home-manager-550e9` project is selected (top-left dropdown).
2. **Enable the Calendar API:** go to **APIs & Services → Library**, search
   for "Google Calendar API", click it, then click **Enable**.
3. **Configure the consent screen:** go to **APIs & Services → OAuth consent
   screen**. If not already configured, choose **External**, fill in an app
   name (e.g. "Home Manager") and your email for the required fields, and save
   through the wizard. Then find the **Test users** section and add both your
   and your wife's Gmail addresses. This keeps the app in "Testing" mode,
   which avoids Google's app-review process (only needed for public apps) —
   fine since it's just your family using it.
4. **Create an OAuth Client ID:** go to **APIs & Services → Credentials** →
   **Create Credentials → OAuth client ID** → Application type: **Web
   application** → under "Authorized JavaScript origins" click **Add URI** and
   enter `https://home-manager-550e9.firebaseapp.com` → **Create**. Copy the
   **Client ID** it shows you (looks like `123...-abc....apps.googleusercontent.com`).
5. Open `calendar-config.js` in this repo and paste that value in place of
   `REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID`. Like the Firebase config, this
   isn't secret — it's safe to commit.

### Create the shared calendar

1. In [Google Calendar](https://calendar.google.com/), under "Other calendars"
   click **+ → Create new calendar**, name it (e.g. "Family"), and create it.
2. Find that calendar in the left sidebar → hover it → click the **⋮** menu →
   **Settings and sharing**.
3. Under **Share with specific people**, add both your and your wife's Gmail
   addresses with **"Make changes to events"** permission.
4. Scroll down to **Integrate calendar** and copy the **Calendar ID** (looks
   like `abcdef123456@group.calendar.google.com`).
5. In Home Manager, go to **Settings → Google Calendar Sync**, paste that ID,
   and save.

### Connect each device

Because the Calendar API needs its own permission grant separate from signing
in, click **Connect Google Calendar (this device)** in Settings once per
phone/computer you use — you'll see a Google consent popup the first time.
After that, syncing happens automatically while the app is open, or via the
**Sync now** button on the Calendar tab.

## Gmail invite detection (optional)

Automatically adds formal calendar invitations from your Gmail (emails
containing a `.ics` invite file) to your shared calendar. This is separate
from, and a bigger permission grant than, Calendar sync above — it reads your
whole Gmail inbox at the permission level, even though the app's code only
looks at messages with calendar invite attachments. Only set this up if
you're comfortable with that.

It does **not** detect casual event mentions in ordinary email text (e.g. "let's
grab dinner Friday") — only structured calendar invite files, which is a much
more reliable, deterministic thing to detect.

### One-time setup

Same Google Cloud project as before (`home-manager-550e9`):

1. In [console.cloud.google.com](https://console.cloud.google.com/), go to
   **APIs & Services → Library**, search for **"Gmail API"**, and click **Enable**.
2. Go to **APIs & Services → OAuth consent screen** (may show as "Google Auth
   Platform" depending on when you're reading this — Google has been
   redesigning this page). Look for a **Data access** or **Scopes** section
   and check whether it lists the Gmail readonly scope
   (`https://www.googleapis.com/auth/gmail.readonly`). If there's an "Add or
   remove scopes" option and it's not listed, add it. If you don't see a way
   to do this, it may not be required — try connecting from the app first
   (next section) and come back here only if that fails.
3. No new OAuth Client ID needed — this reuses the same one Calendar sync uses.

### Connect Gmail

In Home Manager, go to **Settings → Gmail Invite Detection** and click
**Connect Gmail (detect calendar invites)**. Approve the consent screen (it
may look more serious/scarier than the Calendar one, since Gmail access is a
more sensitive permission — that's expected for a personal "Testing" mode app
like this one, not a sign something is wrong). It'll scan recent email
automatically once connected, and again every 5 minutes while the app is open,
or via **Sync now** on the Calendar tab.

Like Calendar sync, this connects per-device/per-Gmail-account — each person
connects separately for their own inbox to be scanned.

## Connecting Home Assistant (optional)

If you already run [Home Assistant](https://www.home-assistant.io/) on your
home network, you can show live device states on the Smart Home tab:

1. In Home Assistant, go to your profile (bottom-left) → **Security** →
   **Long-Lived Access Tokens** → **Create Token**. Copy it somewhere safe.
2. Find your Home Assistant URL (Settings → About), e.g. `http://homeassistant.local:8123`.
3. In Home Manager, go to **Settings → Home Assistant Connection**, paste the
   URL and token, and save.
4. Go to the **Smart Home** tab and add an entity ID to track, e.g.
   `light.living_room` or `climate.thermostat` (find entity IDs under
   Home Assistant's **Developer Tools → States**).

**Note:** Because this is a browser-based app talking directly to your Home
Assistant instance, Home Assistant needs to allow requests from wherever you
host this dashboard. Add the dashboard's URL to Home Assistant's `configuration.yaml`:

```yaml
http:
  cors_allowed_origins:
    - "https://home-manager-550e9.web.app"
```

Then restart Home Assistant. If you don't have Home Assistant set up, you can
skip this section entirely — the rest of the app works fine without it.

## Project structure

```
index.html           Page layout, tabs, and sign-in screen
style.css             Styling
app.js                App logic, Firebase Auth + Firestore sync
firebase-config.js    Your Firebase project's public config (fill in during setup)
calendar-config.js    Google OAuth Client ID for Calendar sync (fill in during setup)
firebase.json         Firebase Hosting config (which files to deploy)
.firebaserc           Which Firebase project this repo deploys to
```

## Roadmap ideas

- Recurring chores
- Meal planning tab
- Push notifications / reminders
- Per-person views so each family member sees just their own assigned tasks
