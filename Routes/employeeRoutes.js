const express = require("express");
const router = express.Router();

const {
  getEmployees,
  createEmployee,
  updateEmployeeStatus,
} = require("../Controllers/employeeController");

const {
  verifyToken,
  requireAdmin,
} = require("../Middlewears/authMiddleware");

router.use(verifyToken, requireAdmin);

router.get("/", getEmployees);
router.post("/", createEmployee);
router.patch("/:id/status", updateEmployeeStatus);

module.exports = router;