/**
 * CORS configuration for the application
 */
module.exports = {
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : [
            'http://localhost:3000',  // Default frontend
            'http://localhost:5173'   // Default Vite frontend
          ]
};
