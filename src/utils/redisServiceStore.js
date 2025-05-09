const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1', // or 'localhost'
  port: process.env.REDIS_PORT || 6379,
  connectTimeout: 5000, // optional: shorter timeout
});

/**
 * Store a uniqueId in Redis with queue details and expiry.
 * @param {string} uniqueId - Unique identifier for the message.
 * @param {string} serviceName - Name of the sender service.
 * @param {string} receiveQueueName - Queue name for receiving confirmation.
 * @param {number} expiryInSeconds - Expiry time in seconds (default: 15s).
 * @param {Object} payload - The actual message payload.
 */
const storeUniqueId = async (uniqueId, serviceName, receiveQueueName, expiryInSeconds = 15, payload = {}) => {
    const expiryTimestamp = Date.now() + expiryInSeconds * 1000; // Expiry time (milliseconds)

    await redis.hmset(`queue:${uniqueId}`, {
        serviceName,
        receiveQueueName,
        expiryTime: expiryTimestamp,
        payload: JSON.stringify(payload),
    });

    await redis.expire(`queue:${uniqueId}`, expiryInSeconds);

    console.log(`Stored uniqueId: ${uniqueId} from ${serviceName} to ${receiveQueueName} (expires in ${expiryInSeconds}s)`);
};

/**
 * Check if a uniqueId is still valid in Redis.
 * @param {string} uniqueId - The unique ID to check.
 * @returns {Promise<boolean>} - Returns true if valid, false otherwise.
 */
const isUniqueIdValid = async (uniqueId) => {
    const data = await redis.hgetall(`queue:${uniqueId}`);

    if (!data || Object.keys(data).length === 0) {
        return false; // Unique ID does not exist or expired
    }

    if (Date.now() > parseInt(data.expiryTime, 10)) {
        await redis.del(`queue:${uniqueId}`);
        return false;
    }

    return true;
};

/**
 * Retrieve message details from Redis.
 * @param {string} uniqueId - The unique ID to fetch data for.
 * @returns {Promise<Object|null>} - Returns message details or null if not found.
 */
const getMessageDetails = async (uniqueId) => {
    const data = await redis.hgetall(`queue:${uniqueId}`);
    if (!data || Object.keys(data).length === 0) return null;

    return {
        serviceName: data.serviceName,
        receiveQueueName: data.receiveQueueName,
        expiryTime: data.expiryTime,
        payload: JSON.parse(data.payload),
    };
};

/**
 * Delete a uniqueId from Redis manually.
 * @param {string} uniqueId - The unique ID to delete.
 */
const removeUniqueId = async (uniqueId) => {
    await redis.del(`queue:${uniqueId}`);
    console.log(`Deleted uniqueId: ${uniqueId} from Redis.`);
};

module.exports = {
    storeUniqueId,
    isUniqueIdValid,
    getMessageDetails,
    removeUniqueId,
};
