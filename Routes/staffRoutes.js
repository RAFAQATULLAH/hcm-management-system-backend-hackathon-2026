
const express = require("express");
const router = express.Router();

const {
  verifyStaffToken,
  allowStaffRoles,
} = require("../Middlewears/staffAuthMiddleware");

// HR dashboard API
router.get(
  "/hr/dashboard",
  verifyStaffToken,
  allowStaffRoles("hr"),
  (req, res) => {
    res.json({
      message: "Welcome to the HR dashboard",
      user: req.user,
    });
  }
);

// Employee dashboard API
router.get(
  "/employee/dashboard",
  verifyStaffToken,
  allowStaffRoles("employee"),
  (req, res) => {
    res.json({
      message: "Welcome to the Employee dashboard",
      user: req.user,
    });
  }
);

module.exports = router;
