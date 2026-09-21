// Home Manager - client-side app. Data is shared and synced live via Firebase
// (Firestore) between everyone signed in with an authorized Google account.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { googleClientId } from "./calendar-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const householdRef = doc(db, "households", "main");

const DEFAULT_STATE = {
  members: [{ id: uid(), name: "Everyone", color: "#4f8cff" }],
  chores: [],
  events: [],
  shopping: [],
  smartHome: {
    haUrl: "",
    haToken: "",
    entities: [],
  },
  calendarSync: {
    calendarId: "",
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

let state = structuredClone(DEFAULT_STATE);
let unsubscribeSnapshot = null;

// ---------- Auth ----------
// Uses a full-page redirect (not a popup) for sign-in: some static hosts,
// including GitHub Pages, send security headers that prevent Firebase's
// sign-in popup from closing itself, which leaves the popup hanging and
// the sign-in stuck. Redirect-based sign-in avoids that entirely.
document.getElementById("signin-btn").addEventListener("click", () => {
  document.getElementById("signin-error").textContent = "";
  signInWithRedirect(auth, new GoogleAuthProvider());
});

getRedirectResult(auth).catch((err) => {
  document.getElementById("signin-error").textContent = "Sign-in failed: " + err.message;
});

document.getElementById("signout-btn").addEventListener("click", () => {
  signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  if (!user) {
    document.getElementById("signin-screen").hidden = false;
    document.getElementById("app-shell").hidden = true;
    return;
  }

  document.getElementById("user-email").textContent = user.email;

  unsubscribeSnapshot = onSnapshot(
    householdRef,
    (snap) => {
      document.getElementById("signin-screen").hidden = true;
      document.getElementById("app-shell").hidden = false;
      if (snap.exists()) {
        state = { ...structuredClone(DEFAULT_STATE), ...snap.data() };
      } else {
        state = structuredClone(DEFAULT_STATE);
        setDoc(householdRef, state).catch((err) => console.error("Failed to initialize shared data", err));
      }
      renderAll();
      refreshSmartHome();
    },
    (err) => {
      document.getElementById("signin-screen").hidden = false;
      document.getElementById("app-shell").hidden = true;
      document.getElementById("signin-error").textContent =
        "Your Google account isn't authorized for this family dashboard.";
      console.error(err);
    }
  );
});

async function saveState() {
  try {
    await setDoc(householdRef, state);
  } catch (err) {
    console.error("Failed to save shared data", err);
  }
}

// ---------- Tabs ----------
document.getElementById("tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab-btn");
  if (!btn) return;
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.tab).classList.add("active");
});

// ---------- Members ----------
function renderMembers() {
  const list = document.getElementById("member-list");
  list.innerHTML = "";
  state.members.forEach((m) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="assignee-tag" style="background:${m.color}"></span>
      <span class="item-text">${escapeHtml(m.name)}</span>
      <button class="delete-btn" data-id="${m.id}" title="Remove">✕</button>
    `;
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.members = state.members.filter((x) => x.id !== m.id);
      saveState();
    });
    list.appendChild(li);
  });

  const select = document.getElementById("chore-assignee");
  select.innerHTML = state.members
    .map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`)
    .join("");
}

document.getElementById("member-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("member-name").value.trim();
  const color = document.getElementById("member-color").value;
  if (!name) return;
  state.members.push({ id: uid(), name, color });
  saveState();
  e.target.reset();
  document.getElementById("member-color").value = "#4f8cff";
});

function memberById(id) {
  return state.members.find((m) => m.id === id);
}

// ---------- Chores ----------
function renderChores() {
  const list = document.getElementById("chore-list");
  list.innerHTML = "";
  const sorted = [...state.chores].sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1));
  sorted.forEach((c) => {
    const assignee = memberById(c.assignee);
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" ${c.done ? "checked" : ""} />
      ${assignee ? `<span class="assignee-tag" style="background:${assignee.color}"></span>` : ""}
      <span class="item-text ${c.done ? "done" : ""}">${escapeHtml(c.text)}</span>
      <span class="item-meta">${c.due ? formatDate(c.due) : ""}</span>
      <button class="delete-btn" title="Delete">✕</button>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      c.done = e.target.checked;
      saveState();
    });
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.chores = state.chores.filter((x) => x.id !== c.id);
      saveState();
    });
    list.appendChild(li);
  });

  const dashList = document.getElementById("dashboard-chores");
  dashList.innerHTML = "";
  state.chores
    .filter((c) => !c.done)
    .slice(0, 5)
    .forEach((c) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="item-text">${escapeHtml(c.text)}</span>`;
      dashList.appendChild(li);
    });
  if (!state.chores.some((c) => !c.done)) {
    dashList.innerHTML = `<li class="hint">Nothing pending 🎉</li>`;
  }
}

document.getElementById("chore-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("chore-text").value.trim();
  const assignee = document.getElementById("chore-assignee").value;
  const due = document.getElementById("chore-due").value;
  if (!text) return;
  state.chores.push({ id: uid(), text, assignee, due, done: false });
  saveState();
  e.target.reset();
});

// ---------- Calendar / Events ----------
let showPastEvents = false;

document.getElementById("toggle-past-events").addEventListener("click", () => {
  showPastEvents = !showPastEvents;
  document.getElementById("toggle-past-events").textContent = showPastEvents ? "Hide past events" : "Show past events";
  renderEvents();
});

function formatTime12h(time) {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function renderEvents() {
  const container = document.getElementById("event-list");
  container.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...state.events]
    .filter((ev) => showPastEvents || ev.date >= today)
    .sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));

  const byDate = new Map();
  sorted.forEach((ev) => {
    if (!byDate.has(ev.date)) byDate.set(ev.date, []);
    byDate.get(ev.date).push(ev);
  });

  if (byDate.size === 0) {
    container.innerHTML = `<p class="hint">No ${showPastEvents ? "" : "upcoming "}events.</p>`;
  }

  byDate.forEach((evs, date) => {
    const isToday = date === today;
    const group = document.createElement("div");
    group.className = "day-group" + (isToday ? " today" : "");

    const heading = document.createElement("h3");
    heading.className = "day-heading";
    heading.textContent = isToday ? "Today" : formatDateLong(date);
    group.appendChild(heading);

    const list = document.createElement("ul");
    list.className = "item-list";
    evs.forEach((ev) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="item-text">${escapeHtml(ev.title)}${ev.fromGoogle ? " 📅" : ""}</span>
        <span class="item-meta">${ev.time ? formatTime12h(ev.time) : "All day"}</span>
        <button class="delete-btn" title="Delete">✕</button>
      `;
      li.querySelector(".delete-btn").addEventListener("click", () => {
        state.events = state.events.filter((x) => x.id !== ev.id);
        saveState();
        deleteEventFromCalendar(ev).catch(() => {});
        renderEvents();
      });
      list.appendChild(li);
    });
    group.appendChild(list);
    container.appendChild(group);
  });

  const dashList = document.getElementById("dashboard-events");
  dashList.innerHTML = "";
  const upcoming = sorted.filter((ev) => ev.date >= today).slice(0, 5);
  upcoming.forEach((ev) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="item-text">${escapeHtml(ev.title)}</span><span class="item-meta">${formatDate(ev.date)}</span>`;
    dashList.appendChild(li);
  });
  if (upcoming.length === 0) {
    dashList.innerHTML = `<li class="hint">No upcoming events</li>`;
  }
}

document.getElementById("event-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("event-title").value.trim();
  const date = document.getElementById("event-date").value;
  const time = document.getElementById("event-time").value;
  if (!title || !date) return;
  const ev = { id: uid(), title, date, time };
  state.events.push(ev);
  saveState();
  e.target.reset();
  renderEvents();
  pushEventToCalendar(ev)
    .then(() => saveState())
    .catch(() => {});
});

// ---------- Google Calendar sync ----------
// This is separate from the app's Google sign-in above: reading/writing
// Calendar events needs its own OAuth scope, requested here via Google's
// Identity Services library. The resulting access token lives only in
// memory for this browser tab (never saved to Firestore or localStorage)
// and lasts about an hour, so syncing only happens while the app is open.
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
let calendarAccessToken = null;
let calendarTokenClient = null;

function calendarStatus(text) {
  document.getElementById("calendar-connect-status").textContent = text;
  document.getElementById("calendar-sync-status").textContent = text;
}

function ensureCalendarTokenClient() {
  if (calendarTokenClient) return calendarTokenClient;
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error("Google library still loading, try again in a moment.");
  }
  calendarTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleClientId,
    scope: CALENDAR_SCOPE,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        calendarAccessToken = tokenResponse.access_token;
        syncCalendarNow();
      }
    },
  });
  return calendarTokenClient;
}

document.getElementById("connect-calendar-btn").addEventListener("click", () => {
  try {
    ensureCalendarTokenClient().requestAccessToken({ prompt: calendarAccessToken ? "" : "consent" });
  } catch (err) {
    calendarStatus(err.message);
  }
});

document.getElementById("calendar-id-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.calendarSync.calendarId = document.getElementById("calendar-id").value.trim();
  saveState();
});

function renderCalendarSyncSettings() {
  document.getElementById("calendar-id").value = state.calendarSync.calendarId || "";
}

async function calendarApiFetch(path, options = {}) {
  if (!calendarAccessToken) throw new Error("not-connected");
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(state.calendarSync.calendarId)}`;
  const res = await fetch(base + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${calendarAccessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    calendarAccessToken = null;
    throw new Error("token-expired");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? null : res.json();
}

async function pushEventToCalendar(ev) {
  if (!calendarAccessToken || !state.calendarSync.calendarId || ev.fromGoogle) return;
  const body = {
    summary: ev.title,
    start: ev.time ? { dateTime: `${ev.date}T${ev.time}:00` } : { date: ev.date },
    end: ev.time ? { dateTime: `${ev.date}T${ev.time}:00` } : { date: ev.date },
    extendedProperties: { private: { homeManagerId: ev.id } },
  };
  if (ev.googleEventId) {
    await calendarApiFetch(`/events/${ev.googleEventId}`, { method: "PATCH", body: JSON.stringify(body) });
  } else {
    const created = await calendarApiFetch(`/events`, { method: "POST", body: JSON.stringify(body) });
    ev.googleEventId = created.id;
  }
}

async function deleteEventFromCalendar(ev) {
  if (!calendarAccessToken || !ev.googleEventId || ev.fromGoogle) return;
  await calendarApiFetch(`/events/${ev.googleEventId}`, { method: "DELETE" });
}

async function pullEventsFromCalendar() {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const data = await calendarApiFetch(
    `/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=250`
  );
  const homeManagerIds = new Set(state.events.map((e) => e.id));
  const byGoogleId = new Map(state.events.filter((e) => e.googleEventId).map((e) => [e.googleEventId, e]));

  (data.items || []).forEach((item) => {
    const hmId = item.extendedProperties && item.extendedProperties.private && item.extendedProperties.private.homeManagerId;
    if (hmId && homeManagerIds.has(hmId)) return; // our own pushed event, already represented locally
    const date = item.start.date || (item.start.dateTime || "").slice(0, 10);
    const time = item.start.dateTime ? item.start.dateTime.slice(11, 16) : "";
    const existing = byGoogleId.get(item.id);
    if (existing) {
      existing.title = item.summary || "(untitled)";
      existing.date = date;
      existing.time = time;
    } else {
      state.events.push({ id: uid(), title: item.summary || "(untitled)", date, time, googleEventId: item.id, fromGoogle: true });
    }
  });
}

async function syncCalendarNow() {
  if (!state.calendarSync.calendarId) {
    calendarStatus("Add a shared calendar ID above first.");
    return;
  }
  if (!calendarAccessToken) {
    calendarStatus("Not connected on this device.");
    return;
  }
  calendarStatus("Syncing...");
  try {
    for (const ev of state.events.filter((e) => !e.fromGoogle)) {
      await pushEventToCalendar(ev);
    }
    await pullEventsFromCalendar();
    saveState();
    renderEvents();
    calendarStatus("Synced just now.");
  } catch (err) {
    calendarStatus(
      err.message === "token-expired" ? "Connection expired — click Connect again." : "Sync failed: " + err.message
    );
  }
}

document.getElementById("sync-calendar-now").addEventListener("click", () => {
  syncCalendarNow();
  if (gmailAccessToken) scanGmailForInvites().catch(() => {});
});

setInterval(() => {
  if (calendarAccessToken) syncCalendarNow();
  if (gmailAccessToken) scanGmailForInvites().catch(() => {});
}, 5 * 60 * 1000);

// ---------- Gmail invite detection ----------
// Separate OAuth grant from Calendar sync above, since reading Gmail is a
// much broader permission than reading/writing calendar events. Looks only
// for formal calendar invites (messages containing a text/calendar / .ics
// part), not free-form event mentions in ordinary emails -- that would need
// AI-based parsing and a backend to call it securely, which this app doesn't have.
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
let gmailAccessToken = null;
let gmailTokenClient = null;

function ensureGmailTokenClient() {
  if (gmailTokenClient) return gmailTokenClient;
  if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
    throw new Error("Google library still loading, try again in a moment.");
  }
  gmailTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleClientId,
    scope: GMAIL_SCOPE,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        gmailAccessToken = tokenResponse.access_token;
        document.getElementById("gmail-connect-status").textContent = "Connected. Scanning for invites...";
        scanGmailForInvites().catch((err) => {
          document.getElementById("gmail-connect-status").textContent = "Scan failed: " + err.message;
        });
      }
    },
  });
  return gmailTokenClient;
}

document.getElementById("connect-gmail-btn").addEventListener("click", () => {
  try {
    ensureGmailTokenClient().requestAccessToken({ prompt: gmailAccessToken ? "" : "consent" });
  } catch (err) {
    document.getElementById("gmail-connect-status").textContent = err.message;
  }
});

async function gmailApiFetch(path) {
  if (!gmailAccessToken) throw new Error("not-connected");
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${gmailAccessToken}` },
  });
  if (res.status === 401) {
    gmailAccessToken = null;
    throw new Error("token-expired");
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function base64UrlDecode(data) {
  const binary = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

function findCalendarParts(part, found = []) {
  if (!part) return found;
  const isIcs = part.mimeType === "text/calendar" || (part.filename && part.filename.toLowerCase().endsWith(".ics"));
  if (isIcs) found.push(part);
  (part.parts || []).forEach((p) => findCalendarParts(p, found));
  return found;
}

async function getIcsText(messageId, part) {
  if (part.body && part.body.data) return base64UrlDecode(part.body.data);
  if (part.body && part.body.attachmentId) {
    const att = await gmailApiFetch(`/messages/${messageId}/attachments/${part.body.attachmentId}`);
    return base64UrlDecode(att.data);
  }
  return null;
}

function unescapeIcsText(value) {
  return value.replace(/\\n/g, " ").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsDate(rawKey, value) {
  if (rawKey.includes("VALUE=DATE") && !rawKey.includes("VALUE=DATE-TIME")) {
    return { date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}` };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return { date: `${y}-${mo}-${d}`, time: `${h}:${mi}` };
}

function parseIcsEvents(icsText) {
  const lines = icsText.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "").split(/\r\n|\n/);
  const events = [];
  let current = null;
  let method = "";
  lines.forEach((line) => {
    if (line.startsWith("METHOD:")) method = line.slice(7).trim();
    if (line === "BEGIN:VEVENT") {
      current = {};
      return;
    }
    if (line === "END:VEVENT") {
      if (current) events.push({ ...current, method });
      current = null;
      return;
    }
    if (!current) return;
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0];
    if (key === "SUMMARY") current.summary = unescapeIcsText(value);
    else if (key === "UID") current.uid = value;
    else if (key === "DTSTART") current.start = parseIcsDate(rawKey, value);
  });
  return events;
}

async function scanGmailForInvites() {
  if (!gmailAccessToken) return;
  const list = await gmailApiFetch(`/messages?q=${encodeURIComponent("filename:ics newer_than:60d")}&maxResults=25`);
  const messages = list.messages || [];
  const existingUids = new Set(state.events.filter((e) => e.gmailInviteUid).map((e) => e.gmailInviteUid));
  let added = 0;

  for (const m of messages) {
    const full = await gmailApiFetch(`/messages/${m.id}?format=full`);
    const icsParts = findCalendarParts(full.payload);
    for (const part of icsParts) {
      const icsText = await getIcsText(m.id, part);
      if (!icsText) continue;
      for (const ev of parseIcsEvents(icsText)) {
        if (!ev.uid || !ev.summary || !ev.start || ev.method === "CANCEL") continue;
        if (existingUids.has(ev.uid)) continue;
        const localEvent = { id: uid(), title: ev.summary, date: ev.start.date, time: ev.start.time || "", gmailInviteUid: ev.uid };
        state.events.push(localEvent);
        existingUids.add(ev.uid);
        added++;
        await pushEventToCalendar(localEvent).catch(() => {});
      }
    }
  }

  if (added > 0) {
    saveState();
    renderEvents();
  }
  document.getElementById("gmail-connect-status").textContent =
    added > 0 ? `Added ${added} invite(s) just now.` : "Scanned — no new invites found.";
}

// ---------- Shopping List ----------
function renderShopping() {
  const list = document.getElementById("shopping-list");
  list.innerHTML = "";
  state.shopping.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} />
      <span class="item-text ${item.done ? "done" : ""}">${escapeHtml(item.text)}</span>
      <button class="delete-btn" title="Delete">✕</button>
    `;
    li.querySelector("input").addEventListener("change", (e) => {
      item.done = e.target.checked;
      saveState();
    });
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.shopping = state.shopping.filter((x) => x.id !== item.id);
      saveState();
    });
    list.appendChild(li);
  });

  const dashList = document.getElementById("dashboard-shopping");
  dashList.innerHTML = "";
  state.shopping
    .filter((i) => !i.done)
    .slice(0, 5)
    .forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="item-text">${escapeHtml(item.text)}</span>`;
      dashList.appendChild(li);
    });
  if (!state.shopping.some((i) => !i.done)) {
    dashList.innerHTML = `<li class="hint">List is empty</li>`;
  }
}

document.getElementById("shopping-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const text = document.getElementById("shopping-text").value.trim();
  if (!text) return;
  state.shopping.push({ id: uid(), text, done: false });
  saveState();
  e.target.reset();
});

document.getElementById("clear-shopping-done").addEventListener("click", () => {
  state.shopping = state.shopping.filter((i) => !i.done);
  saveState();
});

// ---------- Smart Home (Home Assistant) ----------
document.getElementById("ha-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.smartHome.haUrl = document.getElementById("ha-url").value.trim().replace(/\/$/, "");
  state.smartHome.haToken = document.getElementById("ha-token").value.trim();
  saveState();
  refreshSmartHome();
});

document.getElementById("entity-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("entity-id").value.trim();
  if (!id) return;
  if (!state.smartHome.entities.includes(id)) {
    state.smartHome.entities.push(id);
    saveState();
  }
  e.target.reset();
  refreshSmartHome();
});

function renderSmartHomeSettings() {
  document.getElementById("ha-url").value = state.smartHome.haUrl || "";
  document.getElementById("ha-token").value = state.smartHome.haToken || "";
}

async function refreshSmartHome() {
  const statusEl = document.getElementById("smarthome-status");
  const list = document.getElementById("entity-list");
  list.innerHTML = "";

  if (!state.smartHome.haUrl || !state.smartHome.haToken) {
    statusEl.textContent = "Not connected. Add your Home Assistant URL and token in Settings.";
    state.smartHome.entities.forEach((id) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="item-text">${escapeHtml(id)}</span><button class="delete-btn" title="Remove">✕</button>`;
      li.querySelector(".delete-btn").addEventListener("click", () => {
        state.smartHome.entities = state.smartHome.entities.filter((x) => x !== id);
        saveState();
        refreshSmartHome();
      });
      list.appendChild(li);
    });
    return;
  }

  statusEl.textContent = "Connecting...";
  let connected = true;

  for (const entityId of state.smartHome.entities) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="item-text">${escapeHtml(entityId)}</span><span class="item-meta">loading...</span><button class="delete-btn" title="Remove">✕</button>`;
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.smartHome.entities = state.smartHome.entities.filter((x) => x !== entityId);
      saveState();
      refreshSmartHome();
    });
    list.appendChild(li);

    try {
      const res = await fetch(`${state.smartHome.haUrl}/api/states/${encodeURIComponent(entityId)}`, {
        headers: {
          Authorization: `Bearer ${state.smartHome.haToken}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      li.querySelector(".item-meta").textContent = data.state;
    } catch (err) {
      connected = false;
      li.querySelector(".item-meta").textContent = "error";
    }
  }

  statusEl.textContent = connected
    ? "Connected to Home Assistant."
    : "Could not reach Home Assistant. Check the URL, token, and that CORS is allowed for this origin.";
}

// ---------- Settings: export / reset ----------
document.getElementById("export-data").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "home-manager-data.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("reset-data").addEventListener("click", () => {
  if (!confirm("This will erase all Home Manager data for EVERYONE signed in to this dashboard. Continue?")) return;
  state = structuredClone(DEFAULT_STATE);
  saveState();
});

// ---------- Helpers ----------
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDateLong(isoDate) {
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function renderAll() {
  renderMembers();
  renderChores();
  renderEvents();
  renderShopping();
  renderSmartHomeSettings();
  renderCalendarSyncSettings();
}
