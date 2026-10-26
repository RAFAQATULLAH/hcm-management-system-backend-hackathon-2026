
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const StaffUser=require("../models/StaffUser")
const Admin = require("../models/Admin");

// Get all HR accounts and support searching/filtering
exports.getHRAccounts = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = { role: "hr" };

    if (status !== "all") {
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          message: "Invalid status",
        });
      }

      filter.status = status;
    }

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const hrAccounts = await StaffUser.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: hrAccounts.length,
      hrAccounts,
    });
  } catch (error) {
    console.error("Get HR error:", error);
    res.status(500).json({
      message: "Failed to fetch HR accounts",
    });
  }
};

// Create a new HR account
exports.createHRAccount = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim()
    ) {
      return res.status(400).json({
        message: "Name and email are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      name.trim().length > 100 ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: "Please provide valid name and email",
      });
    }

    // Check both account collections
    const existingAdmin = await Admin.findOne({
      email: normalizedEmail,
    });

    const existingStaff = await StaffUser.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin || existingStaff) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    // Generate a temporary password
    const temporaryPassword = crypto
      .randomBytes(12)
      .toString("base64url");

    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      12
    );

    const hr = await StaffUser.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "hr",
      status: "active",
    });

    res.status(201).json({
      message: "HR account created successfully",
      hr: {
        id: hr._id,
        name: hr.name,
        email: hr.email,
        role: hr.role,
        status: hr.status,
        createdAt: hr.createdAt,
      },
      temporaryPassword,
    });
  } catch (error) {
    console.error("Create HR error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    res.status(500).json({
      message: "Failed to create HR account",
    });
  }
};

// Activate or deactivate an HR account
exports.updateHRStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be active or inactive",
      });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        message: "Invalid account ID",
      });
    }

    const hr = await StaffUser.findOneAndUpdate(
      { _id: id, role: "hr" },
      { status },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!hr) {
      return res.status(404).json({
        message: "HR account not found",
      });
    }

    res.status(200).json({
      message: "HR status updated successfully",
      hr,
    });
  } catch (error) {
    console.error("Update HR status error:", error);
    res.status(500).json({
      message: "Failed to update HR status",
    });
  }
};
