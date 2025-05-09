const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const xssClean = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const morgan = require("morgan");
const { corsConfig } = require("./config/corsConfig");
const { errorHandler } = require("./utils/errorHandler");
const scheduleRoutes = require("./modules/scheduler/scheduler.route");

const app = express();

// Security Middleware
app.use(cors({
  origin: corsConfig?.allowedOrigins || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true // Important for cookies/auth
}));
app.use(cookieParser());
app.use(helmet()); // Sets security HTTP headers
app.use(express.json()); // Parses JSON request body
app.use(xssClean()); // Prevents cross-site scripting (XSS) attacks
app.use(mongoSanitize()); // Prevents NoSQL injection attacks
app.use(morgan("combined")); // Logs API requests

// Rate Limiting Middleware (Applies to All API Requests)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    error: "Too many requests from this IP, please try again later.",
  },
  headers: true, // Sends RateLimit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
});

// Apply Rate Limiting to All API Endpoints
app.use("/api/v1", apiLimiter);

// Scheduler Routes
app.use("/api/v1/scheduler", scheduleRoutes);

// Initialize scheduler service
const schedulerService = require('./modules/scheduler/scheduler.service');
schedulerService.initializeScheduler();

// 404 handler for undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.originalUrl} not found`,
      errorCode: 'NOT_FOUND',
      details: null
    }
  });
});

// Global error handling middleware
app.use(errorHandler);

module.exports = app;
