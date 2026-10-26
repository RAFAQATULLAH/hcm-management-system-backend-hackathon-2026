const express = require("express");
const router = express.Router();
const { verifyStaffToken, allowStaffRoles } = require("../Middlewears/staffAuthMiddleware");
const c = require("../Controllers/staffFeatureController");

router.use(verifyStaffToken);

router.get("/hr/dashboard", allowStaffRoles("hr"), c.hrDashboard);
router.get("/employee/dashboard", allowStaffRoles("employee"), c.employeeDashboard);

router.get("/hr/employees", allowStaffRoles("hr"), c.listEmployees);
router.get("/hr/employees/:id", allowStaffRoles("hr"), c.getEmployee);

router.get("/hr/attendance", allowStaffRoles("hr"), c.getHRAttendance);
router.post("/hr/attendance", allowStaffRoles("hr"), c.saveAttendance);
router.get("/attendance/me", allowStaffRoles("employee"), c.myAttendance);

router.get("/hr/leaves", allowStaffRoles("hr"), c.listHRLeaves);
router.patch("/hr/leaves/:id", allowStaffRoles("hr"), c.reviewLeave);
router.get("/leaves/me", allowStaffRoles("employee"), c.myLeaves);
router.post("/leaves", allowStaffRoles("employee"), c.createLeave);

router.get("/reports/summary", allowStaffRoles("hr"), c.reportSummary);

router.get("/profile", c.getProfile);
router.patch("/profile", c.updateProfile);
router.patch("/change-password", c.changePassword);
router.get("/notifications", c.notifications);

module.exports = router;
