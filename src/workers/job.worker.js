const { parentPort, workerData } = require('worker_threads');
const axios = require('axios');

/**
 * Execute an API call based on job configuration
 * @param {Object} job - The job configuration
 */
async function executeJob(job) {
  const { url, method, headers, body } = job;
  const startTime = Date.now();
  
  try {
    // Add target service client ID and secret if provided
    let requestHeaders = { ...headers };
    
    if (job.targetServiceClientId && job.targetServiceSecret) {
      requestHeaders['x-client-id'] = job.targetServiceClientId;
      requestHeaders['x-client-secret'] = job.targetServiceSecret;
    }
    
    const response = await axios({
      url,
      method,
      headers: requestHeaders,
      data: method !== 'GET' ? body : undefined,
      params: method === 'GET' ? body : undefined,
      timeout: 30000, // 30 seconds timeout
    });
    
    const duration = Date.now() - startTime;
    
    // Send successful result back to parent thread
    parentPort.postMessage({
      success: true,
      status: response.status,
      data: response.data,
      duration,
      jobId: job.id,
      jobName: job.name
    });
  } catch (error) {
    const errorResponse = error.response || {};
    
    // Send error result back to parent thread
    parentPort.postMessage({
      success: false,
      error: error.message,
      status: errorResponse.status,
      jobId: job.id,
      jobName: job.name,
      duration: Date.now() - startTime
    });
  }
}

// Execute the job received from the main thread
executeJob(workerData); 