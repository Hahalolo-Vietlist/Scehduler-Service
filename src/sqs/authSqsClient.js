// Updated authSqsClient.js to use utils/sqs.js
const { sendMessage, receiveMessage, deleteMessage } = require('../utils/sqs');
const logger = require('../utils/logger');
const { isUniqueIdValid } = require('../utils/redisServiceStore');
const { AUTH_QUEUE } = require('../utils/constants');

/**
 * Send an authentication event to the Auth service via SQS
 * @param {string} eventType - Type of authentication event
 * @param {Object} payload - Event payload data
 * @returns {Promise<Object>} - SQS send result
 */
const sendAuthEvent = async (eventType, payload) => {
    try {
        const message = {
            msgId : payload?.serviceId,
            action : eventType,
            timestamp: new Date().toISOString(),
            payload,
            callbackQueue: AUTH_QUEUE
        };

        const result = await sendMessage(AUTH_QUEUE, message);
        logger.info(`Sent ${eventType} event to Auth service: ${payload.serviceId}`);
        return result;
    } catch (error) {
        logger.error(`Error sending ${eventType} event: ${error.message}`, { stack: error.stack, payload });
        throw error;
    }
};

/**
 * Poll for a response from the Auth service based on serviceId
 * @param {string} serviceId - Service ID to match in the response
 * @param {number} timeoutMs - Maximum time to wait for a response in milliseconds
 * @returns {Promise<Object|null>} - Response data or null if timeout
 */
const receiveAuthResponse = async (serviceId, timeoutMs = 30000) => {
    const startTime = Date.now();

    while ((Date.now() - startTime) < timeoutMs) {
        try {
            if (!(await isUniqueIdValid(serviceId))) {
                logger.warn(`ServiceId ${serviceId} is no longer valid, stopping polling`);
                return null;
            }

            const message = await receiveMessage(AUTH_QUEUE);
            if (message) {
                const messageBody = JSON.parse(message.Body);
                if (messageBody.payload?.msgId === serviceId) {
                    await deleteMessage(AUTH_QUEUE, message.ReceiptHandle);
                    logger.info(`Received Auth response for serviceId: ${serviceId}`);
                    return messageBody.payload;
                }
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            logger.error(`Error receiving Auth response: ${error.message}`, { stack: error.stack });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    logger.warn(`Timeout waiting for Auth response for serviceId: ${serviceId}`);
    return null;
};

module.exports = {
    sendAuthEvent,
    receiveAuthResponse
};