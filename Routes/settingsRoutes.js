
const express = require("express");
const router = express.Router();

const {
  getSettings,
  updateProfile,
  changePassword,
} = require("../Controllers/settingsController");

const {
  verifyToken,
  requireAdmin,
} = require("../Middlewears/authMiddleware");

router.use(verifyToken, requireAdmin);

router.get("/", getSettings);
router.patch("/profile", updateProfile);
router.patch("/password", changePassword);

module.exports = router;
