const swaggerUi = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const app = require("./app");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 5000;

// Import swagger documentation
require("./docs/swaggerDocs");

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Scheduler Service API",
      version: "1.0.0",
      description: "A service for scheduling and executing API calls at specified intervals",
      contact: {
        name: "API Support",
        email: "support@example.com"
      }
    },
    servers: [
      {
        url: "/api/v1",
        description: "API v1"
      }
    ]
  },
  apis: ["./src/docs/swaggerDocs.js"]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (req, res) => {
  res.status(200).json({ success: true, message: "Scheduler Service is Healthy" });
});

app.listen(PORT, async () => {
  logger.info(`Scheduler Service is running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
});
