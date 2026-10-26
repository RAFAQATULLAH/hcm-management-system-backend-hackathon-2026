const express = require("express");
const router = express.Router();

const {
  getSetupStatus,
  setupAdmin,
  loginAdmin,
  changeAdminPassword,
} = require("../Controllers/adminAuthController");

const {
  verifyToken,
  requireAdmin,
} = require("../Middlewears/authMiddleware");

// Check whether the first Admin needs to be created
router.get("/setup/status", getSetupStatus);

// Create the first Admin account
router.post("/setup", setupAdmin);

// Admin login
router.post("/login", loginAdmin);


// Update password (Admin authentication required)
router.patch(
  "/change-password",
  verifyToken,
  requireAdmin,
  changeAdminPassword
);

module.exports = router;