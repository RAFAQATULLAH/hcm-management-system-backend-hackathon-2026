const mongoose = require("mongoose");
const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "StaffUser", required: true, index: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
  hrNote: { type: String, trim: true, maxlength: 500, default: "" },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "StaffUser", default: null },
}, { timestamps: true });
module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
