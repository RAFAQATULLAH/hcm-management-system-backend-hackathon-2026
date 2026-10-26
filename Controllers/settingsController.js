
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");

// GET: Get the logged-in Admin's settings
exports.getSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select(
      "-passwordHash"
    );

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.status(200).json({
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ message: "Failed to load settings." });
  }
};

// PATCH: Update Admin profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user.id },
    });

    if (existingAdmin) {
      return res.status(409).json({
        message: "This email is already being used.",
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name: name.trim(),
          email: normalizedEmail,
        },
      },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    res.status(200).json({
      message: "Profile updated successfully.",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already being used.",
      });
    }

    res.status(500).json({ message: "Failed to update profile." });
  }
};

// PATCH: Change Admin password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new passwords are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters.",
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      admin.passwordHash
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect.",
      });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    res.status(200).json({
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password." });
  }
};
