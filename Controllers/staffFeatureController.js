const bcrypt = require("bcryptjs");
const StaffUser = require("../Models/StaffUser");
const Attendance = require("../Models/Attendance");
const LeaveRequest = require("../Models/LeaveRequest");

function dayBounds(input) {
  // The app is used in Pakistan; use the same calendar day as the staff date input,
  // even when the Node server itself runs in UTC.
  let dateString = input;
  if (!dateString) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    dateString = `${values.year}-${values.month}-${values.day}`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new Error("Invalid date");
  const [year, month, day] = dateString.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.getUTCFullYear() !== year || start.getUTCMonth() !== month - 1 || start.getUTCDate() !== day) {
    throw new Error("Invalid date");
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

exports.hrDashboard = async (req, res) => {
  try {
    const { start, end } = dayBounds();
    const [totalEmployees, presentToday, absentToday, pendingLeaves] = await Promise.all([
      StaffUser.countDocuments({ role: "employee", status: "active" }),
      Attendance.countDocuments({ date: { $gte: start, $lt: end }, status: "present" }),
      Attendance.countDocuments({ date: { $gte: start, $lt: end }, status: "absent" }),
      LeaveRequest.countDocuments({ status: "pending" }),
    ]);
    const user = await StaffUser.findById(req.user.id).select("name email role");
    res.json({ user, stats: { totalEmployees, presentToday, absentToday, pendingLeaves } });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not load HR dashboard" }); }
};

exports.employeeDashboard = async (req, res) => {
  try {
    const { start, end } = dayBounds();
    const [user, todayRecord, pendingLeaves, approvedLeaves] = await Promise.all([
      StaffUser.findById(req.user.id).select("name email role"),
      Attendance.findOne({ employee: req.user.id, date: { $gte: start, $lt: end } }),
      LeaveRequest.countDocuments({ employee: req.user.id, status: "pending" }),
      LeaveRequest.countDocuments({ employee: req.user.id, status: "approved" }),
    ]);
    res.json({ user, todayStatus: todayRecord?.status || "Not marked", pendingLeaves, approvedLeaves });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not load employee dashboard" }); }
};

exports.listEmployees = async (req, res) => {
  try {
    const employees = await StaffUser.find({ role: "employee" }).select("name email role status createdAt updatedAt").sort({ name: 1 });
    res.json({ employees });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not load employees" }); }
};

exports.getEmployee = async (req, res) => {
  try {
    const employee = await StaffUser.findOne({ _id: req.params.id, role: "employee" }).select("name email role status createdAt updatedAt");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ employee });
  } catch (error) { res.status(400).json({ message: "Invalid employee ID" }); }
};

exports.getHRAttendance = async (req, res) => {
  try {
    const { start, end } = dayBounds(req.query.date);
    const attendance = await Attendance.find({ date: { $gte: start, $lt: end } }).select("employee status date").lean();
    res.json({ attendance: attendance.map(a => ({ _id: a._id, employeeId: String(a.employee), status: a.status, date: a.date })) });
  } catch (error) { res.status(400).json({ message: "Invalid attendance date" }); }
};

exports.saveAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!Array.isArray(records) || !date) return res.status(400).json({ message: "Date and attendance records are required" });
    const { start, end } = dayBounds(date);
    const employeeIds = records.map(r => r.employeeId);
    const validEmployees = await StaffUser.find({ _id: { $in: employeeIds }, role: "employee" }).select("_id");
    const validIds = new Set(validEmployees.map(e => String(e._id)));
    const operations = [];
    for (const record of records) {
      if (!validIds.has(String(record.employeeId))) continue;
      if (!["present", "absent", "late", "leave"].includes(record.status)) return res.status(400).json({ message: "Invalid attendance status" });
      operations.push({ updateOne: { filter: { employee: record.employeeId, date: { $gte: start, $lt: end } }, update: { $set: { employee: record.employeeId, date: start, status: record.status, markedBy: req.user.id } }, upsert: true } });
    }
    if (operations.length) await Attendance.bulkWrite(operations);
    res.json({ message: "Attendance saved", saved: operations.length });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not save attendance" }); }
};

exports.myAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find({ employee: req.user.id }).sort({ date: -1 }).limit(180).select("date status createdAt");
    res.json({ attendance });
  } catch (error) { res.status(500).json({ message: "Could not load attendance" }); }
};

exports.listHRLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find().populate("employee", "name email").sort({ createdAt: -1 }).limit(300);
    res.json({ leaves });
  } catch (error) { res.status(500).json({ message: "Could not load leave requests" }); }
};

exports.myLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employee: req.user.id }).sort({ createdAt: -1 }).limit(200);
    res.json({ leaves });
  } catch (error) { res.status(500).json({ message: "Could not load leave history" }); }
};

exports.createLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason } = req.body;
    if (!startDate || !endDate || !reason || reason.trim().length < 4) return res.status(400).json({ message: "Start date, end date, and a reason of at least 4 characters are required" });
    const start = new Date(startDate); const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return res.status(400).json({ message: "Please provide valid leave dates" });
    const leave = await LeaveRequest.create({ employee: req.user.id, startDate: start, endDate: end, reason: reason.trim() });
    res.status(201).json({ message: "Leave request submitted", leave });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not submit leave request" }); }
};

exports.reviewLeave = async (req, res) => {
  try {
    const { status, hrNote = "" } = req.body;
    if (!["approved", "rejected"].includes(status)) return res.status(400).json({ message: "Status must be approved or rejected" });
    const leave = await LeaveRequest.findByIdAndUpdate(req.params.id, { status, hrNote: String(hrNote).slice(0, 500), reviewedBy: req.user.id }, { new: true, runValidators: true }).populate("employee", "name email");
    if (!leave) return res.status(404).json({ message: "Leave request not found" });
    res.json({ message: `Leave request ${status}`, leave });
  } catch (error) { res.status(400).json({ message: "Could not update leave request" }); }
};

exports.reportSummary = async (req, res) => {
  try {
    const { start, end } = dayBounds();
    const [totalEmployees, activeEmployees, presentToday, absentToday, pendingLeaves, approvedLeaves] = await Promise.all([
      StaffUser.countDocuments({ role: "employee" }),
      StaffUser.countDocuments({ role: "employee", status: "active" }),
      Attendance.countDocuments({ date: { $gte: start, $lt: end }, status: "present" }),
      Attendance.countDocuments({ date: { $gte: start, $lt: end }, status: "absent" }),
      LeaveRequest.countDocuments({ status: "pending" }),
      LeaveRequest.countDocuments({ status: "approved" }),
    ]);
    res.json({ totalEmployees, activeEmployees, presentToday, absentToday, pendingLeaves, approvedLeaves, generatedAt: new Date() });
  } catch (error) { res.status(500).json({ message: "Could not generate report" }); }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await StaffUser.findById(req.user.id).select("name email role status createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) { res.status(500).json({ message: "Could not load profile" }); }
};

exports.updateProfile = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    if (name.length < 2 || name.length > 80) return res.status(400).json({ message: "Name must be between 2 and 80 characters" });
    const user = await StaffUser.findByIdAndUpdate(req.user.id, { name }, { new: true, runValidators: true }).select("name email role status createdAt");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Profile updated", user });
  } catch (error) { res.status(500).json({ message: "Could not update profile" }); }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) return res.status(400).json({ message: "Current password and a new password of at least 8 characters are required" });
    const user = await StaffUser.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) return res.status(400).json({ message: "Current password is incorrect" });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password changed successfully" });
  } catch (error) { console.error(error); res.status(500).json({ message: "Could not change password" }); }
};

exports.notifications = async (req, res) => {
  try {
    const query = req.user.role === "hr" ? {} : { employee: req.user.id };
    const leaves = await LeaveRequest.find(query).sort({ updatedAt: -1 }).limit(20).populate("employee", "name");
    const notifications = leaves.map(l => ({
      _id: String(l._id),
      type: "leave",
      title: req.user.role === "hr" ? `Leave request ${l.status}` : `Your leave request is ${l.status}`,
      message: req.user.role === "hr" ? `${l.employee?.name || "An employee"} submitted a leave request for ${new Date(l.startDate).toLocaleDateString()} – ${new Date(l.endDate).toLocaleDateString()}.` : `Your request from ${new Date(l.startDate).toLocaleDateString()} to ${new Date(l.endDate).toLocaleDateString()} is ${l.status}.`,
      createdAt: l.updatedAt,
    }));
    res.json({ notifications });
  } catch (error) { res.status(500).json({ message: "Could not load notifications" }); }
};
