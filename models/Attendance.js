const mongoose = require("mongoose");
const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "StaffUser", required: true, index: true },
  date: { type: Date, required: true, index: true },
  status: { type: String, enum: ["present", "absent", "late", "leave"], required: true },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffUser", required: true },
}, { timestamps: true });
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
module.exports = mongoose.model("Attendance", attendanceSchema);
