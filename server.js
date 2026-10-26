require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const employeeRoutes = require("./Routes/employeeRoutes");
const settingsRoutes = require("./Routes/settingsRoutes");

const app = express();


const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://hcm-admin-management-system-hackath.vercel.app",
  // Add your deployed Staff frontend URL here
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);


app.use(express.json());

// Admin authentication routes

app.use("/api/admin-auth", require("./Routes/adminAuthRoutes"));
app.use("/api/admin", require("./Routes/adminDashboardRoutes"));
app.use("/api/admin/hr", require("./Routes/hrRoutes"));
app.use("/api/admin/employees", employeeRoutes);
app.use("/api/admin/settings", settingsRoutes);



app.get("/", (req, res) => {
  res.send("HCM Lite Backend is running!");
});

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
      throw new Error("MONGO_URI and JWT_SECRET must be configured.");
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully");

    const PORT = process.env.PORT || 4000;

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();