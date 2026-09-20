# Home Manager

A simple family dashboard to help run daily household life: shared chores,
a family calendar, a shopping list, and an optional live view of your
[Home Assistant](https://www.home-assistant.io/) smart-home devices.

It's a plain HTML/CSS/JavaScript app — no build tools, no server, no
account sign-up required. It runs entirely in your browser.

## Features

- **Dashboard** — at-a-glance view of open chores, upcoming events, and your shopping list
- **Chores** — add tasks, assign them to a family member, set a due date, check them off
- **Calendar** — a simple list of upcoming family events
- **Shopping List** — a shared list you can check items off as you shop
- **Smart Home** — optionally connect to a Home Assistant instance to see live device states (lights, sensors, thermostats, etc.)
- **Settings** — manage family members and connection details

## Try it locally (no install needed)

1. Download or clone this repository.
2. Open `index.html` in your web browser (double-click it, or right-click → Open With → your browser).
3. Start adding chores, events, and shopping items. Your data is saved automatically in that browser.

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

## How your data is stored

Home Manager currently saves everything in your browser's local storage
(`localStorage`). That means:

- Nothing leaves your device, and there's no account or server to set up.
- **Data does not sync between different phones/computers.** Each device/browser
  has its own separate copy. This is fine for a single shared family tablet or
  computer, but if everyone uses their own phone, you'll each see different lists.

If you want everyone's phone to see the same shared data, the natural next step
is adding a small free backend (for example, Firebase or Supabase) so the app
syncs in real time. That's a good follow-up project once you're comfortable
with this version — just ask and we can add it.

You can also use **Settings → Export data** any time to download a backup as JSON.

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
index.html   Page layout and tabs
style.css    Styling
app.js       App logic and data storage
```

## Roadmap ideas

- Shared/synced data across devices (e.g. via Firebase)
- Recurring chores
- Meal planning tab
- Push notifications / reminders
- Multi-user login so each family member sees their own assigned tasks
