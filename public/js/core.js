// Shared by every page: Firebase init, auth guard and small UI helpers.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

export const isConfigured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => {
  const value = String(firebaseConfig[key] || "").trim();
  return value.length > 0 && !value.startsWith("YOUR_") && !value.includes("PASTE_");
});
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/* ---------- constants (edit DEPARTMENTS to match your college) ---------- */
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const DEPARTMENTS = ["Computer Science", "Data Science", "Information Technology", "Electronics", "Mechanical", "Civil"];
export const YEARS = [1, 2, 3, 4];
export const DASHBOARD = { student: "student.html", teacher: "teacher.html" };

/* ---------- DOM helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const fillSelect = (sel, items, placeholder) => {
  sel.innerHTML = (placeholder ? `<option value="">${esc(placeholder)}</option>` : "") + items.map((i) => `<option value="${esc(i)}">${esc(i)}</option>`).join("");
};
export const skeleton = (n = 3) => Array.from({ length: n }, () => '<div class="skeleton"></div>').join("");

export function showMsg(el, text, type = "error") {
  if (!el) return;
  el.className = `msg ${type}`;
  el.textContent = text;
  el.hidden = !text;
}
export function setBusy(btn, busy, label) {
  if (busy) { btn.dataset.label = btn.textContent; btn.textContent = label || "Please wait…"; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
  btn.disabled = busy;
}
export function toast(message, type = "") {
  let host = $(".toasts");
  if (!host) { host = document.createElement("div"); host.className = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
export function friendlyError(e) {
  const map = {
    "auth/invalid-credential": "Wrong email or password.",
    "auth/wrong-password": "Wrong email or password.",
    "auth/user-not-found": "Wrong email or password.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists.",
    "auth/weak-password": "Password must be at least 8 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
    "auth/network-request-failed": "Network problem. Check your connection.",
    "auth/configuration-not-found": "Email/Password sign-in is not enabled in Firebase yet.",
    "auth/operation-not-allowed": "Email/Password sign-in is not enabled in Firebase yet.",
    "permission-denied": "Firebase denied this request. Check that Firestore exists and you deployed the included firestore.rules.",
    "firestore/permission-denied": "Firebase denied this request. Check Firestore and deploy the included firestore.rules.",
    "auth/unauthorized-domain": "This website domain is not allowed. In Firebase Authentication → Settings → Authorized domains, add localhost or your hosting domain.",
    "auth/invalid-api-key": "The Firebase API key is invalid. Copy the web app config again from Firebase Project settings.",
    "unavailable": "Firestore is temporarily unavailable. Check your internet connection and Firebase project status."
  };
  return map[e?.code] || e?.message || "Something went wrong. Please try again.";
}

/* ---------- time helpers ---------- */
export const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
export const todayName = () => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
export const fmtTime = (t) => { const [h, m] = String(t).split(":").map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
export const fmtDate = (ts) => {
  const d = ts?.toDate ? ts.toDate() : ts ? new Date(ts) : null;
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "just now";
};
export const hoursText = (min) => (min % 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min / 60}h`);
export const initials = (n = "") => n.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
export const byDayTime = (a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || toMin(a.start) - toMin(b.start);

/* ---------- shared markup ---------- */
export function slotHTML(e, { who = "teacher", now = false } = {}) {
  const sub = who === "teacher" ? esc(e.teacherName) : `${esc(e.department)} · Year ${esc(e.year)}`;
  return `<div class="slot${now ? " now" : ""}"><div class="when">${fmtTime(e.start)}<br><small>${fmtTime(e.end)}</small></div>
    <div><strong>${esc(e.courseName)}</strong><small>${esc(e.courseCode)} · Room ${esc(e.room)} · ${sub}</small></div></div>`;
}
const AUD = { all: "Everyone", students: "Students", teachers: "Teachers" };
export function announcementHTML(a, canDelete = false) {
  return `<article class="note"><div class="note-head"><h3>${esc(a.title)}</h3>${canDelete ? `<button class="btn danger sm" data-del-ann="${esc(a.id)}" type="button">Delete</button>` : ""}</div>
    <div class="meta"><span class="tag">${AUD[a.audience] ?? "Everyone"}</span><span>${esc(a.authorName)}</span><span>${fmtDate(a.createdAt)}</span></div><p>${esc(a.body)}</p></article>`;
}

/* ---------- clash detection: same room, same teacher, or same department + year ---------- */
export function findConflicts(c, entries, ignoreId = null) {
  const out = [];
  for (const e of entries) {
    if (e.id === ignoreId || e.day !== c.day) continue;
    if (!(toMin(c.start) < toMin(e.end) && toMin(e.start) < toMin(c.end))) continue;
    if (String(e.room).toLowerCase() === c.room.toLowerCase()) out.push({ type: "Room", with: e });
    if (e.teacherId === c.teacherId) out.push({ type: "Teacher", with: e });
    if (e.department === c.department && Number(e.year) === Number(c.year)) out.push({ type: "Student group", with: e });
  }
  return out;
}

/* ---------- auth ---------- */
export async function getProfile(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export function requireRole(expected) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return location.replace("login.html");
      try {
        const profile = await getProfile(user);
        if (!profile || !DASHBOARD[profile.role]) { await signOut(auth); return location.replace("login.html?e=profile"); }
        if (profile.role !== expected) return location.replace(DASHBOARD[profile.role]);
        document.body.classList.remove("gated");
        resolve({ user, profile });
      } catch (err) {
        console.error(err);
        await signOut(auth);
        location.replace("login.html?e=session");
      }
    });
  });
}
export const wireLogout = () => $$("[data-logout]").forEach((b) => b.addEventListener("click", async () => { await signOut(auth); location.replace("../index.html"); }));

/* ---------- sidebar views ---------- */
export function initNav(defaultView) {
  const show = (name) => {
    const views = $$(".view");
    if (!views.some((v) => v.id === `view-${name}`)) name = defaultView;
    views.forEach((v) => (v.hidden = v.id !== `view-${name}`));
    $$("[data-view]").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    history.replaceState(null, "", `#${name}`);
    window.scrollTo({ top: 0 });
  };
  $$("[data-view]").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  show(location.hash.slice(1) || defaultView);
}
