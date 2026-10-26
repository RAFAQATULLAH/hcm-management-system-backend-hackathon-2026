const express = require("express");
const router = express.Router();
const { staffLogin } = require("../Controllers/staffAuthController");

router.post("/login", staffLogin);
module.exports = router;
