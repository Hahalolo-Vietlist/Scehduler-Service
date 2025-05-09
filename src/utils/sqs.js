const AWS = require('aws-sdk');
const crypto = require('crypto');
const { QUEUE_URL } = require('./constants');
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test';

const sqs = new AWS.SQS({
    endpoint: QUEUE_URL,
    region: AWS_REGION,
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
    }
});
const queueUrlCache = {}; // ensureQueueExists frequently calls sqs.getQueueUrl

const sendMessage = async (queueUrlOrName, message) => {
    let queueUrl = queueUrlOrName;
    
    // Check if the parameter is a queue name rather than a URL
    if (!queueUrlOrName.startsWith('http')) {
        queueUrl = `${QUEUE_URL}/${queueUrlOrName}`;
    }
    
    const params = {
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message)
    };

    // Add MessageGroupId and MessageDeduplicationId for FIFO queues
    if (queueUrl.endsWith('.fifo')) {
        const msgId = message.msgId || crypto.randomUUID();
        params.MessageGroupId = msgId;
        params.MessageDeduplicationId = msgId;
    }

    try {
        const result = await sqs.sendMessage(params).promise();
        console.log(`Send message to: ${queueUrl}`, message);

        return result;
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

const receiveMessage = async (queueUrlOrName) => {
    let queueUrl = queueUrlOrName;
    
    // Check if the parameter is a queue name rather than a URL
    if (!queueUrlOrName.startsWith('http')) {
        queueUrl = `${QUEUE_URL}/${queueUrlOrName}`;
    }
    
    const params = {
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 0 
    };

    try {
        const result = await sqs.receiveMessage(params).promise();
        const msg = result.Messages ? result.Messages[0] : null;
        // We need to pass the original queueUrlOrName since it's what was used to call this function
        // await handleQueueEvents(msg, queueUrlOrName);
        
        return msg; 
    } catch (error) {
        console.error(`Error receiving message from ${queueUrl}:`, error);
        throw error;
    }
};

const deleteMessage = async (queueUrlOrName, receiptHandle) => {
    let queueUrl = queueUrlOrName;
    
    // Check if the parameter is a queue name rather than a URL
    if (!queueUrlOrName.startsWith('http')) {
        queueUrl = `${QUEUE_URL}/${queueUrlOrName}`;
    }
    
    const params = {
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle
    };

    try {
        await sqs.deleteMessage(params).promise();
        console.log('Message deleted successfully');

    } catch (error) {
        console.error('Error deleting message:', error);
        throw error;
    }
};

const ensureQueueExists = async (queueName) => {
    if (queueUrlCache[queueName]) return queueUrlCache[queueName];

    try {
        const result = await sqs.getQueueUrl({ QueueName: queueName }).promise();
        queueUrlCache[queueName] = result.QueueUrl;
        return result.QueueUrl;
    } catch (error) {
        if (error.code === 'AWS.SimpleQueueService.NonExistentQueue') {
            console.warn(`Queue "${queueName}" does not exist.`);
            return null;
        }
        throw error;
    }
};

const startConsumeQueue = async (queueName) => {
    while (true) {
        try {
            const message = await receiveMessage(queueName);

            if (message) {
                console.log(`Processing message from ${queueName}:`, message);
            } else {
                console.log(`${queueName} - No new messages...`);
            }
        } catch (error) {
            console.error(`Error in consumer: ${queueName}`, error);
        }

        // Wait before polling again
        await new Promise(resolve => setTimeout(resolve, 500));
    }
};

const processDLQMessages = async (dlqName) => {
    console.log(`Monitoring DLQ: ${dlqName}`);

    while (true) {
        try {
            const msg = await receiveMessage(dlqName);
            if (msg) {
                console.log("DLQ Message:", msg.Body);
                console.log("Investigate why it failed.");
                
            } else {
                console.log("No messages in DLQ...");
            }
        } catch (error) {
            console.error("Error processing DLQ messages:".dlqName, error);
        }
        await new Promise(resolve => setTimeout(resolve, 500)); // Poll every 5 seconds
    }
};

const handleQueueEvents = async (message, queueNameOrUrl) => {
    
}

module.exports = {
    sendMessage,
    receiveMessage,
    deleteMessage,
    startConsumeQueue,
    processDLQMessages
};
