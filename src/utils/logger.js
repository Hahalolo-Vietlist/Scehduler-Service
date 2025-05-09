const winston = require("winston");
const path = require("path");

// Define log levels and colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Create format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}${info.data ? ' - ' + JSON.stringify(info.data, null, 2) : ''}`
  )
);

// Define which transports to use based on environment
const transports = [
  // Always log to console
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      logFormat
    ),
  }),
  // Log to file
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/error.log'),
    level: 'error',
  }),
  new winston.transports.File({
    filename: path.join(__dirname, '../../logs/combined.log'),
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  levels,
  format: logFormat,
  transports,
});

// Extend logger to handle objects/errors better
const extendedLogger = {
  error: (message, data) => {
    if (data instanceof Error) {
      logger.error(message, {
        data: {
          message: data.message,
          stack: data.stack,
          ...data
        }
      });
    } else {
      logger.error(message, { data });
    }
  },
  warn: (message, data) => logger.warn(message, { data }),
  info: (message, data) => logger.info(message, { data }),
  http: (message, data) => logger.http(message, { data }),
  debug: (message, data) => logger.debug(message, { data }),
};

module.exports = extendedLogger;
