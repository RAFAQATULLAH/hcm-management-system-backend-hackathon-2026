const express = require("express");
const router = express.Router();

const { getDashboard } = require("../Controllers/adminDashboardController");

const {
  verifyToken,
  requireAdmin,
} = require("../Middlewears/authMiddleware");

router.get(
  "/dashboard",
  verifyToken,
  requireAdmin,
  getDashboard
);

module.exports = router;