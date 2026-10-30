import { auth, isConfigured, getProfile, DASHBOARD, $, friendlyError, setBusy, showMsg } from "./core.js";
import { signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const form = $("#loginForm"), msg = $("#formMsg");
let busy = false;
if (!isConfigured) $("#configBanner").hidden = false;
const e = new URLSearchParams(location.search).get("e");
if (e === "profile") showMsg(msg, "Your account profile was not found. Please register again.");
if (e === "session") showMsg(msg, "Your session could not be verified. Please sign in again.");

onAuthStateChanged(auth, async (user) => {
  if (!user || busy) return;
  try { const p = await getProfile(user); if (p && DASHBOARD[p.role]) location.replace(DASHBOARD[p.role]); } catch { /* sign in manually */ }
});

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  showMsg(msg, "");
  const btn = form.querySelector("button[type=submit]");
  busy = true;
  setBusy(btn, true, "Signing in…");
  try {
    const cred = await signInWithEmailAndPassword(auth, form.email.value.trim(), form.password.value);
    const p = await getProfile(cred.user);
    if (!p || !DASHBOARD[p.role]) { await signOut(auth); return showMsg(msg, "Your account profile was not found. Please register again."); }
    location.replace(DASHBOARD[p.role]);
  } catch (err) { showMsg(msg, friendlyError(err)); }
  finally { busy = false; setBusy(btn, false); }
});

$("#forgotBtn").addEventListener("click", async () => {
  const email = form.email.value.trim();
  if (!email) return showMsg(msg, "Enter your email above first.", "warn");
  try { await sendPasswordResetEmail(auth, email); } catch (err) { if (err.code !== "auth/user-not-found") return showMsg(msg, friendlyError(err)); }
  showMsg(msg, "If an account exists for that email, a reset link is on its way.", "ok");
});
