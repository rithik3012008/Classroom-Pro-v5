import {
  db, requireRole, wireLogout, initNav, $, DAYS, DEPARTMENTS, YEARS, esc, fillSelect, fmtTime, greeting, initials, skeleton, slotHTML,
  todayName, nowMin, friendlyError, hoursText, toMin, byDayTime, announcementHTML, findConflicts, setBusy, showMsg, toast
} from "./core.js";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const { user, profile } = await requireRole("teacher");
wireLogout();
initNav("overview");

$("#avatar").textContent = initials(profile.name);
$("#userName").textContent = profile.name;
$("#userMeta").textContent = profile.department;
$("#greet").textContent = `${greeting()}, ${profile.name.split(" ")[0]}`;
$("#dateLabel").textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

let all = [], courses = [], announcements = [];
const mine = () => all.filter((e) => e.teacherId === user.uid);

/* ---------------- Schedule editor with clash detection ---------------- */
const ttForm = $("#ttForm"), f = ttForm.elements, ttMsg = $("#ttMsg"), ttSubmit = ttForm.querySelector("button[type=submit]");
let editingId = null;
fillSelect(f.year, YEARS, "Year");
fillSelect(f.day, DAYS, "Day");

function refreshCourseOptions() {
  const keep = f.course.value;
  f.course.innerHTML = '<option value="">Select course…</option>' +
    courses.map((c) => `<option value="${esc(c.id)}">${esc(c.code)} — ${esc(c.name)} (${esc(c.department)})</option>`).join("");
  f.course.value = keep;
}
function resetForm() {
  editingId = null;
  ttForm.reset();
  $("#ttConflicts").innerHTML = "";
  $("#ttFormTitle").textContent = "Add a class";
  showMsg(ttMsg, "");
  ttSubmit.textContent = "Add class";
  $("#cancelEdit").hidden = true;
}
$("#cancelEdit").addEventListener("click", resetForm);

ttForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  showMsg(ttMsg, "");
  $("#ttConflicts").innerHTML = "";
  const course = courses.find((c) => c.id === f.course.value);
  if (!course) return showMsg(ttMsg, "Please select a course. (Add courses in the Courses tab if the list is empty.)");
  const c = {
    courseCode: course.code, courseName: course.name, department: course.department,
    year: Number(f.year.value), day: f.day.value, start: f.start.value, end: f.end.value,
    room: f.room.value.trim(), teacherId: user.uid, teacherName: profile.name
  };
  if (!c.year || !c.day || !c.start || !c.end || !c.room) return showMsg(ttMsg, "Please fill in every field.");
  if (toMin(c.end) <= toMin(c.start)) return showMsg(ttMsg, "End time must be after the start time.");

  const clashes = findConflicts(c, all, editingId);
  if (clashes.length) {
    $("#ttConflicts").innerHTML = clashes.map((x) =>
      `<div class="clash"><b>${x.type} clash</b> with ${esc(x.with.courseCode)} · ${esc(x.with.day)} ${fmtTime(x.with.start)}–${fmtTime(x.with.end)} · Room ${esc(x.with.room)} · ${esc(x.with.teacherName)} · ${esc(x.with.department)} Y${esc(x.with.year)}</div>`).join("");
    return showMsg(ttMsg, "Not saved: this class clashes with the schedule. Change the room, time or day.");
  }
  setBusy(ttSubmit, true, "Saving…");
  try {
    if (editingId) { await updateDoc(doc(db, "timetable", editingId), c); toast("Class updated", "ok"); }
    else { await addDoc(collection(db, "timetable"), { ...c, createdAt: serverTimestamp() }); toast("Class added", "ok"); }
    resetForm();
    load();
  } catch (err) { showMsg(ttMsg, friendlyError(err)); }
  finally { setBusy(ttSubmit, false); }
});

$("#myTable").addEventListener("click", async (e) => {
  const edit = e.target.closest("[data-edit]"), del = e.target.closest("[data-del]");
  if (edit) {
    const en = all.find((x) => x.id === edit.dataset.edit);
    if (!en) return;
    editingId = en.id;
    f.course.value = courses.find((c) => c.code === en.courseCode)?.id ?? "";
    f.year.value = en.year; f.day.value = en.day; f.start.value = en.start; f.end.value = en.end; f.room.value = en.room;
    $("#ttFormTitle").textContent = "Edit class";
    ttSubmit.textContent = "Save changes";
    $("#cancelEdit").hidden = false;
    $("#ttConflicts").innerHTML = "";
    ttForm.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  if (del && confirm("Delete this class?")) {
    try { await deleteDoc(doc(db, "timetable", del.dataset.del)); toast("Class deleted", "ok"); load(); }
    catch (err) { toast(friendlyError(err), "error"); }
  }
});

/* ---------------- Courses ---------------- */
const coForm = $("#courseForm");
fillSelect(coForm.elements.department, DEPARTMENTS, "Select department");
coForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#courseMsg");
  showMsg(msg, "");
  const cf = coForm.elements;
  const code = cf.code.value.trim().toUpperCase();
  const course = { code, name: cf.cname.value.trim(), department: cf.department.value, credits: Number(cf.credits.value) };
  if (code.length < 2 || course.name.length < 2 || !course.department) return showMsg(msg, "Code, name and department are required.");
  if (!Number.isInteger(course.credits) || course.credits < 1 || course.credits > 10) return showMsg(msg, "Credits must be a whole number from 1 to 10.");
  if (courses.some((c) => c.code === code)) return showMsg(msg, `Course ${code} already exists.`);
  const btn = coForm.querySelector("button[type=submit]");
  setBusy(btn, true, "Adding…");
  try {
    await addDoc(collection(db, "courses"), { ...course, createdBy: user.uid, createdAt: serverTimestamp() });
    coForm.reset();
    cf.credits.value = 3;
    toast("Course added", "ok");
    load();
  } catch (err) { showMsg(msg, friendlyError(err)); }
  finally { setBusy(btn, false); }
});
$("#coursesTable").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-delcourse]");
  if (!btn) return;
  const c = courses.find((x) => x.id === btn.dataset.delcourse);
  if (!c) return;
  if (all.some((en) => en.courseCode === c.code)) return toast(`Remove the scheduled classes for ${c.code} first.`, "error");
  if (!confirm(`Delete course ${c.code}?`)) return;
  try { await deleteDoc(doc(db, "courses", c.id)); toast("Course deleted", "ok"); load(); }
  catch (err) { toast(friendlyError(err), "error"); }
});

/* ---------------- Announcements ---------------- */
const annForm = $("#annForm");
annForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("#annMsg");
  showMsg(msg, "");
  const af = annForm.elements;
  const title = af.title.value.trim(), body = af.body.value.trim();
  if (title.length < 3) return showMsg(msg, "Title must be at least 3 characters.");
  if (!body) return showMsg(msg, "Please write a message.");
  const btn = annForm.querySelector("button[type=submit]");
  setBusy(btn, true, "Posting…");
  try {
    await addDoc(collection(db, "announcements"), { title, body, audience: af.audience.value, authorId: user.uid, authorName: profile.name, createdAt: serverTimestamp() });
    annForm.reset();
    toast("Announcement posted", "ok");
    load();
  } catch (err) { showMsg(msg, friendlyError(err)); }
  finally { setBusy(btn, false); }
});
$("#annList").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-del-ann]");
  if (!btn || !confirm("Delete this announcement?")) return;
  try { await deleteDoc(doc(db, "announcements", btn.dataset.delAnn)); toast("Announcement deleted", "ok"); load(); }
  catch (err) { toast(friendlyError(err), "error"); }
});

/* ---------------- Rendering ---------------- */
function render() {
  const list = mine().sort(byDayTime), today = todayName(), now = nowMin();
  const todays = list.filter((e) => e.day === today);
  const upcoming = todays.find((e) => toMin(e.end) > now);
  $("#nextClass").innerHTML = upcoming
    ? `<div class="next"><small>${toMin(upcoming.start) <= now ? "TEACHING NOW" : "NEXT CLASS"}</small><strong>${esc(upcoming.courseName)}</strong>
       <span>${fmtTime(upcoming.start)} – ${fmtTime(upcoming.end)} · Room ${esc(upcoming.room)} · ${esc(upcoming.department)} Y${esc(upcoming.year)}</span></div>`
    : `<div class="next"><small>NEXT CLASS</small><strong>${todays.length ? "Done for today 🎉" : "No classes today"}</strong><span>Nothing else scheduled.</span></div>`;

  const weekMin = list.reduce((s, e) => s + toMin(e.end) - toMin(e.start), 0);
  $("#stats").innerHTML = `
    <div class="stat"><small>Today</small><strong>${todays.length}</strong><span>${todays.length === 1 ? "class" : "classes"}</span></div>
    <div class="stat"><small>This week</small><strong>${list.length}</strong><span>classes</span></div>
    <div class="stat"><small>Teaching load</small><strong>${hoursText(weekMin)}</strong><span>per week</span></div>`;

  $("#todayList").innerHTML = todays.length
    ? todays.map((e) => slotHTML(e, { who: "group", now: toMin(e.start) <= now && toMin(e.end) > now })).join("")
    : '<div class="empty">No classes scheduled today.</div>';
  $("#weekGrid").innerHTML = DAYS.map((d) => {
    const dl = list.filter((e) => e.day === d);
    return `<div class="day${d === today ? " today" : ""}"><h3>${d}</h3>${dl.length ? dl.map((e) => slotHTML(e, { who: "group" })).join("") : "<small>Free</small>"}</div>`;
  }).join("");

  $("#myTable").innerHTML = list.length
    ? `<div class="table"><table><thead><tr><th>Day</th><th>Time</th><th>Course</th><th>Group</th><th>Room</th><th></th></tr></thead><tbody>${list.map((e) =>
        `<tr><td>${esc(e.day)}</td><td>${fmtTime(e.start)} – ${fmtTime(e.end)}</td><td>${esc(e.courseCode)} · ${esc(e.courseName)}</td><td>${esc(e.department)} · Y${esc(e.year)}</td><td>${esc(e.room)}</td>
         <td><div class="row-actions"><button class="btn ghost sm" type="button" data-edit="${esc(e.id)}">Edit</button><button class="btn danger sm" type="button" data-del="${esc(e.id)}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">You have no classes yet. Add your first one above.</div>';

  $("#coursesTable").innerHTML = courses.length
    ? `<div class="table"><table><thead><tr><th>Code</th><th>Name</th><th>Department</th><th>Credits</th><th></th></tr></thead><tbody>${courses.map((c) =>
        `<tr><td><b>${esc(c.code)}</b></td><td>${esc(c.name)}</td><td>${esc(c.department)}</td><td>${esc(c.credits)}</td>
         <td>${c.createdBy === user.uid ? `<button class="btn danger sm" type="button" data-delcourse="${esc(c.id)}">Delete</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">No courses yet. Add one above.</div>';
  $("#courseHint").textContent = courses.length ? "" : "No courses yet. Add one in the Courses tab first.";

  const annTerm = ($("#teacherAnnSearch")?.value || "").trim().toLowerCase();
  const visibleAnnouncements = announcements.filter((a) => `${a.title} ${a.body} ${a.authorName}`.toLowerCase().includes(annTerm));
  $("#annList").innerHTML = visibleAnnouncements.length
    ? visibleAnnouncements.map((a) => announcementHTML(a, a.authorId === user.uid)).join("")
    : `<div class="empty">${annTerm ? "No matching announcements." : "No announcements yet."}</div>`;
}

async function load() {
  $("#todayList").innerHTML = skeleton(2);
  $("#myTable").innerHTML = skeleton(3);
  $("#coursesTable").innerHTML = skeleton(3);
  try {
    const [tt, co, ann] = await Promise.all([
      getDocs(collection(db, "timetable")),
      getDocs(collection(db, "courses")),
      getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(30)))
    ]);
    all = tt.docs.map((d) => ({ id: d.id, ...d.data() }));
    courses = co.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.code.localeCompare(b.code));
    announcements = ann.docs.map((d) => ({ id: d.id, ...d.data() }));
    render();
    refreshCourseOptions();
  } catch (err) {
    console.error(err);
    const html = `<div class="msg error">${esc(friendlyError(err))}</div>`;
    $("#todayList").innerHTML = html;
    $("#myTable").innerHTML = html;
    $("#coursesTable").innerHTML = html;
  }
}
load();
setInterval(() => all.length && render(), 60000); // keep "next class" fresh without touching the form


// Convenience tools for teachers.
$("#teacherAnnSearch")?.addEventListener("input", () => render());
$("#exportTeacherTimetable")?.addEventListener("click", () => {
  const rows = [["Day", "Start", "End", "Course code", "Course name", "Department", "Year", "Room", "Teacher"], ...mine().sort(byDayTime).map((e) => [e.day, e.start, e.end, e.courseCode, e.courseName, e.department, e.year, e.room, e.teacherName])];
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = "my-teaching-timetable.csv"; a.click(); URL.revokeObjectURL(url);
});
