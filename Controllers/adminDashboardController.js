const Admin = require("../models/Admin");
const StaffUser=require("../models/StaffUser")

exports.getDashboard = async (req, res) => {
  try {
    const [
      totalAdmins,
      totalHR,
      totalEmployees,
      activeUsers,
      recentAdmins,
      recentStaff,
    ] = await Promise.all([
      Admin.countDocuments({ role: "admin" }),
      StaffUser.countDocuments({ role: "hr" }),
      StaffUser.countDocuments({ role: "employee" }),
      StaffUser.countDocuments({ status: "active" }),

      Admin.find()
        .select("name email role createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      StaffUser.find()
        .select("name email role status createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const recentActivity = [
      ...recentAdmins.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        status: "active",
      })),

      ...recentStaff.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        status: user.status,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      )
      .slice(0, 8);

    res.json({
      stats: {
        totalAdmins,
        totalHR,
        totalEmployees,
        activeUsers,
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      message: "Could not load dashboard data.",
    });
  }
};