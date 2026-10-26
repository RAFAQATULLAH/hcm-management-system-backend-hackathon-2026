const express = require("express");
const router = express.Router();

const {
  getHRAccounts,
  createHRAccount,
  updateHRStatus,
} = require("../Controllers/hrController");

const {
  verifyToken,
  requireAdmin,
} = require("../Middlewears/authMiddleware");

router.use(verifyToken, requireAdmin);

router.get("/", getHRAccounts);
router.post("/", createHRAccount);
router.patch("/:id/status", updateHRStatus);

module.exports = router;