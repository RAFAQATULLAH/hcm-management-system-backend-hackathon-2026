const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const StaffUser = require("../Models/StaffUser");

exports.staffLogin = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = req.body.password;
    if (!email || typeof password !== "string" || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await StaffUser.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status !== "active") {
      return res.status(403).json({ message: "Your account is inactive. Contact your administrator." });
    }
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment");
      return res.status(500).json({ message: "Server authentication is not configured" });
    }
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    return res.json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Staff login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
