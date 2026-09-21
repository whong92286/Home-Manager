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
8. **Authorize your dashboard's domain:** back in **Authentication → Settings →
   Authorized domains**, click **Add domain** and add your GitHub Pages domain,
   e.g. `<your-username>.github.io` (see the Pages section below to get this URL).

Once that's done, commit and push `firebase-config.js`, then open the app —
you and your wife should each be able to sign in with Google and see the same
live-updating chores, calendar, and shopping list.

## Try it locally

1. Download or clone this repository and complete the Firebase setup above.
2. Because the app uses JavaScript modules, opening `index.html` directly from
   disk won't work in all browsers — instead run a tiny local server from this
   folder, e.g. `python3 -m http.server 8000`, then visit `http://localhost:8000`.
3. Sign in with an approved Google account and start adding chores, events, and shopping items.

## Publish it for free with GitHub Pages

This turns your repo into a real website your family can bookmark on their phones.

1. On GitHub, open this repository in your browser.
2. Click **Settings** (top menu of the repo).
3. In the left sidebar, click **Pages**.
4. Under "Build and deployment" → "Source", choose **Deploy from a branch**.
5. Under "Branch", choose `main` and folder `/ (root)`, then click **Save**.
6. Wait a minute, then refresh the page — GitHub will show you a URL like
   `https://<your-username>.github.io/Home-Manager/`. That's your family dashboard link.

Share that link with your family (via text, a home screen bookmark, etc.).

## How your data is stored and protected

- All chores, events, shopping items, and settings live in one shared Firestore
  document, synced live to every signed-in device — add a chore on your phone,
  it appears on your wife's phone within a second or two.
- **Only Google accounts listed in your Firestore security rules (step 5 above)
  can read or write that data.** Anyone else who opens the site can try to sign
  in, but Firestore will reject their requests — they will not see your family's
  data.
- The web page itself is still publicly reachable (see the GitHub Pages section
  below) — what's actually locked down is the *data*, via Firebase Auth + Rules,
  not the page's HTML/CSS/JS, which is normal and fine for a client-side app.

You can use **Settings → Export data** any time to download a backup as JSON.

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
    - "https://<your-username>.github.io"
```

Then restart Home Assistant. If you don't have Home Assistant set up, you can
skip this section entirely — the rest of the app works fine without it.

## Project structure

```
index.html           Page layout, tabs, and sign-in screen
style.css             Styling
app.js                App logic, Firebase Auth + Firestore sync
firebase-config.js    Your Firebase project's public config (fill in during setup)
```

## Roadmap ideas

- Recurring chores
- Meal planning tab
- Push notifications / reminders
- Per-person views so each family member sees just their own assigned tasks
