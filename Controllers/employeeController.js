
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const StaffUser=require("../models/StaffUser")

// GET: Fetch all employee accounts
exports.getEmployees = async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const filter = { role: "employee" };

    if (["active", "inactive"].includes(status)) {
      filter.status = status;
    }

    if (search.trim()) {
      const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const employees = await StaffUser.find(filter)
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: employees.length,
      employees,
    });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ message: "Failed to fetch employees." });
  }
};

// POST: Create a new employee account
exports.createEmployee = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({
        message: "Name and email are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    const existingStaff = await StaffUser.findOne({
      email: normalizedEmail,
    });

    if (existingAdmin || existingStaff) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    // Generate a temporary password
    const temporaryPassword = crypto.randomBytes(12).toString("base64url");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const employee = await StaffUser.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "employee",
      status: "active",
    });

    res.status(201).json({
      message: "Employee account created successfully.",
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        status: employee.status,
        createdAt: employee.createdAt,
      },
      temporaryPassword,
    });
  } catch (error) {
    console.error("Create employee error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    res.status(500).json({ message: "Failed to create employee." });
  }
};

// PATCH: Activate or deactivate an employee
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid employee ID." });
    }

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message: "Status must be active or inactive.",
      });
    }

    const employee = await StaffUser.findOneAndUpdate(
      { _id: id, role: "employee" },
      { $set: { status } },
      { new: true, runValidators: true }
    ).select("-passwordHash");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    res.status(200).json({
      message: `Employee ${status === "active" ? "activated" : "deactivated"} successfully.`,
      employee,
    });
  } catch (error) {
    console.error("Update employee status error:", error);
    res.status(500).json({ message: "Failed to update employee status." });
  }
};