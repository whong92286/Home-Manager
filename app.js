// Home Manager - client-side app. All data lives in the browser's localStorage.
const STORAGE_KEY = "homeManagerState";

const DEFAULT_STATE = {
  members: [
    { id: uid(), name: "Everyone", color: "#4f8cff" },
  ],
  chores: [],
  events: [],
  shopping: [],
  smartHome: {
    haUrl: "",
    haToken: "",
    entities: [],
  },
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return { ...structuredClone(DEFAULT_STATE), ...parsed };
  } catch (e) {
    console.error("Failed to load state, resetting.", e);
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();

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
      renderAll();
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
  renderAll();
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
      renderAll();
    });
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.chores = state.chores.filter((x) => x.id !== c.id);
      saveState();
      renderAll();
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
  renderAll();
});

// ---------- Calendar / Events ----------
function renderEvents() {
  const list = document.getElementById("event-list");
  list.innerHTML = "";
  const sorted = [...state.events].sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`));
  sorted.forEach((ev) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="item-text">${escapeHtml(ev.title)}</span>
      <span class="item-meta">${formatDate(ev.date)}${ev.time ? " " + ev.time : ""}</span>
      <button class="delete-btn" title="Delete">✕</button>
    `;
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.events = state.events.filter((x) => x.id !== ev.id);
      saveState();
      renderAll();
    });
    list.appendChild(li);
  });

  const dashList = document.getElementById("dashboard-events");
  dashList.innerHTML = "";
  const today = new Date().toISOString().slice(0, 10);
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
  state.events.push({ id: uid(), title, date, time });
  saveState();
  e.target.reset();
  renderAll();
});

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
      renderAll();
    });
    li.querySelector(".delete-btn").addEventListener("click", () => {
      state.shopping = state.shopping.filter((x) => x.id !== item.id);
      saveState();
      renderAll();
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
  renderAll();
});

document.getElementById("clear-shopping-done").addEventListener("click", () => {
  state.shopping = state.shopping.filter((i) => !i.done);
  saveState();
  renderAll();
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
  if (!confirm("This will erase all Home Manager data in this browser. Continue?")) return;
  state = structuredClone(DEFAULT_STATE);
  saveState();
  renderAll();
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

function renderAll() {
  renderMembers();
  renderChores();
  renderEvents();
  renderShopping();
  renderSmartHomeSettings();
}

renderAll();
refreshSmartHome();
