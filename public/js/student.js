import { db, requireRole, wireLogout, initNav, $, DAYS, esc, fmtTime, greeting, initials, skeleton, slotHTML, todayName, nowMin, friendlyError, hoursText, toMin, byDayTime, announcementHTML } from "./core.js";
import { collection, getDocs, query, where, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const { profile } = await requireRole("student");
wireLogout();
initNav("overview");

$("#avatar").textContent = initials(profile.name);
$("#userName").textContent = profile.name;
$("#userMeta").textContent = `${profile.department} · Year ${profile.year}`;
$("#greet").textContent = `${greeting()}, ${profile.name.split(" ")[0]}`;
$("#dateLabel").textContent = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
$("#ttSubtitle").textContent = `${profile.department} · Year ${profile.year}`;
$("#profileList").innerHTML = [["Name", profile.name], ["Email", profile.email], ["Roll number", profile.rollNo], ["Department", profile.department], ["Year", profile.year]]
  .map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join("");

let entries = [], announcements = [];
let timetableSearch = "", announcementSearch = "";

function render() {
  const today = todayName(), now = nowMin();
  const todays = entries.filter((e) => e.day === today);
  const upcoming = todays.find((e) => toMin(e.end) > now);
  $("#nextClass").innerHTML = upcoming
    ? `<div class="next"><small>${toMin(upcoming.start) <= now ? "HAPPENING NOW" : "NEXT CLASS"}</small><strong>${esc(upcoming.courseName)}</strong>
       <span>${fmtTime(upcoming.start)} – ${fmtTime(upcoming.end)} · Room ${esc(upcoming.room)} · ${esc(upcoming.teacherName)}</span></div>`
    : `<div class="next"><small>NEXT CLASS</small><strong>${todays.length ? "No more classes today 🎉" : "No classes today"}</strong><span>Enjoy the free time.</span></div>`;

  const weekMin = entries.reduce((s, e) => s + toMin(e.end) - toMin(e.start), 0);
  $("#stats").innerHTML = `
    <div class="stat"><small>Today</small><strong>${todays.length}</strong><span>${todays.length === 1 ? "class" : "classes"}</span></div>
    <div class="stat"><small>This week</small><strong>${entries.length}</strong><span>classes</span></div>
    <div class="stat"><small>Weekly hours</small><strong>${hoursText(weekMin)}</strong><span>in class</span></div>`;

  $("#todayList").innerHTML = todays.length
    ? todays.map((e) => slotHTML(e, { who: "teacher", now: toMin(e.start) <= now && toMin(e.end) > now })).join("")
    : '<div class="empty">No classes scheduled today.</div>';

  const filteredEntries = entries.filter((e) => [e.courseCode, e.courseName, e.room, e.teacherName, e.day].join(" ").toLowerCase().includes(timetableSearch));
  $("#weekGrid").innerHTML = DAYS.map((d) => {
    const list = filteredEntries.filter((e) => e.day === d);
    return `<div class="day${d === today ? " today" : ""}"><h3>${d}</h3>${list.length ? list.map((e) => slotHTML(e)).join("") : `<small>${timetableSearch ? "No matches" : "No classes"}</small>`}</div>`;
  }).join("");

  const none = '<div class="empty">No announcements yet.</div>';
  $("#latestAnn").innerHTML = announcements.length ? announcements.slice(0, 3).map((a) => announcementHTML(a)).join("") : none;
  const filteredAnnouncements = announcements.filter((a) => `${a.title} ${a.body} ${a.authorName}`.toLowerCase().includes(announcementSearch));
  $("#annList").innerHTML = filteredAnnouncements.length ? filteredAnnouncements.map((a) => announcementHTML(a)).join("") : (announcementSearch ? '<div class="empty">No matching announcements.</div>' : none);
}

async function load() {
  $("#todayList").innerHTML = skeleton(2);
  $("#weekGrid").innerHTML = skeleton(3);
  try {
    const [tt, ann] = await Promise.all([
      getDocs(query(collection(db, "timetable"), where("department", "==", profile.department), where("year", "==", profile.year))),
      getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(30)))
    ]);
    entries = tt.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDayTime);
    announcements = ann.docs.map((d) => ({ id: d.id, ...d.data() })).filter((a) => a.audience === "all" || a.audience === "students");
    render();
  } catch (err) {
    console.error(err);
    const html = `<div class="msg error">${esc(friendlyError(err))}</div>`;
    $("#todayList").innerHTML = html;
    $("#weekGrid").innerHTML = html;
  }
}
load();
setInterval(() => entries.length && render(), 60000);


// Quick tools: filter without changing saved data, export a spreadsheet-friendly CSV, or print.
$("#ttSearch")?.addEventListener("input", (e) => { timetableSearch = e.target.value.trim().toLowerCase(); render(); });
$("#annSearch")?.addEventListener("input", (e) => { announcementSearch = e.target.value.trim().toLowerCase(); render(); });
function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
$("#exportTimetable")?.addEventListener("click", () => {
  const rows = [["Day", "Start", "End", "Course code", "Course name", "Teacher", "Room", "Department", "Year"], ...entries.map((e) => [e.day, e.start, e.end, e.courseCode, e.courseName, e.teacherName, e.room, e.department, e.year])];
  downloadCSV("my-timetable.csv", rows);
});
$("#printTimetable")?.addEventListener("click", () => window.print());
