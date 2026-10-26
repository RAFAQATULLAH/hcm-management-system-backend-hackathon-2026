const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");


const setupLockSchema = new mongoose.Schema({
  _id: String,
});

const AdminSetupLock =
  mongoose.models.AdminSetupLock ||
  mongoose.model("AdminSetupLock", setupLockSchema);

// Check whether initial Admin setup is available
exports.getSetupStatus = async (req, res) => {
  try {
    const adminExists = await Admin.exists({ role: "admin" });

    res.json({
      setupRequired: !adminExists,
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not check setup status.",
    });
  }
};

// Create the first Admin account only
exports.setupAdmin = async (req, res) => {
  let lockCreated = false;

  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({
        message: "Name, email and password are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters.",
      });
    }

    // Stop setup if an Admin already exists
    const existingAdmin = await Admin.exists({ role: "admin" });

    if (existingAdmin) {
      return res.status(403).json({
        message: "Admin setup has already been completed.",
      });
    }

    // Atomically claim the one-time setup process
    await AdminSetupLock.create({
      _id: "initial-admin",
    });

    lockCreated = true;

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: "admin",
      mustChangePassword: false,
    });

    const token = jwt.sign(
      {
        id: admin._id.toString(),
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Admin account created successfully.",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    if (lockCreated) {
      const adminExists = await Admin.exists({ role: "admin" });

      if (!adminExists) {
        await AdminSetupLock.deleteOne({
          _id: "initial-admin",
        });
      }
    }

    if (error.code === 11000) {
      return res.status(403).json({
        message: "Admin setup is already in progress or completed.",
      });
    }

    console.error("Admin setup error:", error);

    return res.status(500).json({
      message: "Could not create Admin account.",
    });
  }
};

// Admin login
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const admin = await Admin.findOne({
      email: email.trim().toLowerCase(),
      role: "admin",
    });

    if (!admin) {
  return res.status(401).json({
    message: "Admin account not found",
  });
}

const isMatch = await bcrypt.compare(
  password,
  admin.passwordHash
);

if (!isMatch) {
  return res.status(401).json({
    message: "Invalid email or password",
  });
}

    const token = jwt.sign(
      {
        id: admin._id.toString(),
        role: admin.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      message: "Login failed. Please try again.",
    });
  }
};

// Change the currently logged-in Admin's password
exports.changeAdminPassword = async (req, res) => {
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

    if (currentPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different.",
      });
    }

    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin account not found.",
      });
    }

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      admin.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    admin.mustChangePassword = false;

    await admin.save();

    return res.json({
      message: "Password updated successfully. Please log in again.",
    });
  } catch (error) {
    console.error("Password update error:", error);

    return res.status(500).json({
      message: "Could not update password.",
    });
  }
};