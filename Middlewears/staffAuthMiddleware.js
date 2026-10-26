const jwt = require("jsonwebtoken");
const StaffUser = require("../models/StaffUser");

exports.verifyStaffToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!["hr", "employee"].includes(decoded.role)) {
      return res.status(403).json({ message: "Staff access only" });
    }
    const user = await StaffUser.findById(decoded.id).select("role status");
    if (!user || user.status !== "active" || user.role !== decoded.role) {
      return res.status(401).json({ message: "Account not found or inactive" });
    }
    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(error.name)) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.error("Staff authentication error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.allowStaffRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "You do not have permission" });
  }
  return next();
};
