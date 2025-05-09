/**
 * Constants used throughout the application
 */

// SQS
exports.SQS = {
  QUEUE_URL: process.env.QUEUE_URL
};

// HTTP Methods
exports.HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD'
};

// Job status
exports.JOB_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  PENDING: 'pending'
};

// Cron expression examples
exports.CRON_EXAMPLES = {
  EVERY_MINUTE: '* * * * *',
  EVERY_5_MINUTES: '*/5 * * * *',
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_MIDNIGHT: '0 0 * * *',
  EVERY_WEEK_SUNDAY: '0 0 * * 0',
  EVERY_MONTH_FIRST_DAY: '0 0 1 * *'
};

// Redis key prefixes
exports.REDIS_KEYS = {
  JOB_PREFIX: 'job:'
};

// Default timeout for API calls in milliseconds
exports.DEFAULT_TIMEOUT = 30000; // 30 seconds 