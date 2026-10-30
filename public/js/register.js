// One page, two mutually exclusive roles: student or teacher.
import { auth, db, isConfigured, DASHBOARD, DEPARTMENTS, YEARS, $, $$, fillSelect, friendlyError, setBusy, showMsg } from "./core.js";
import { createUserWithEmailAndPassword, updateProfile, deleteUser, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const form = $("#registerForm"), msg = $("#formMsg"), submitBtn = $("#submitBtn");
if (!isConfigured) $("#configBanner").hidden = false;
fillSelect(form.department, DEPARTMENTS, "Select department");
fillSelect(form.year, YEARS, "Select year");

let role = "student";
function setRole(next) {
  role = next;
  $("#roleStudent").setAttribute("aria-pressed", String(role === "student"));
  $("#roleTeacher").setAttribute("aria-pressed", String(role === "teacher"));
  $$("[data-student]").forEach((el) => (el.hidden = role !== "student"));
  submitBtn.textContent = `Create ${role} account`;
  showMsg(msg, "");
}
$("#roleStudent").addEventListener("click", () => setRole("student"));
$("#roleTeacher").addEventListener("click", () => setRole("teacher"));
setRole(new URLSearchParams(location.search).get("role") === "teacher" ? "teacher" : "student");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg(msg, "");
  const name = form.fullName.value.trim(), department = form.department.value, email = form.email.value.trim(), password = form.password.value;
  if (name.length < 2) return showMsg(msg, "Please enter your full name.");
  if (!department) return showMsg(msg, "Please choose your department.");
  const profile = { name, role, department };
  if (role === "student") {
    profile.rollNo = form.rollNo.value.trim();
    profile.year = Number(form.year.value);
    if (!profile.rollNo) return showMsg(msg, "Please enter your roll number.");
    if (!profile.year) return showMsg(msg, "Please choose your year.");
  }
  if (password.length < 8) return showMsg(msg, "Password must be at least 8 characters.");
  if (password !== form.confirm.value) return showMsg(msg, "Passwords do not match.");

  setBusy(submitBtn, true, "Creating account…");
  let created = null;
  try {
    created = (await createUserWithEmailAndPassword(auth, email, password)).user;
    await updateProfile(created, { displayName: name });
    await setDoc(doc(db, "users", created.uid), { uid: created.uid, email: created.email, ...profile, createdAt: serverTimestamp() });
    location.replace(DASHBOARD[role]);
  } catch (err) {
    if (created) { try { await deleteUser(created); } catch { await signOut(auth); } }
    showMsg(msg, friendlyError(err));
    setBusy(submitBtn, false);
  }
});
