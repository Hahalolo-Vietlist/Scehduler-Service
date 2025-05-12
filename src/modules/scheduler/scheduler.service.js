const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');
const path = require('path');
const { Worker } = require('worker_threads');
const { DEFAULT_TIMEOUT } = require('../../utils/constants');
const jobRepository = require('./scheduler.repo');

// Configure the worker pool size based on CPU cores
const os = require('os');
let n = os.cpus().length;
const MAX_WORKERS = process.env.MAX_WORKERS ? parseInt(process.env.MAX_WORKERS) : Math.max(1, Math.floor(n / 2) - 1);
console.log('cpu cores', n);
console.log('max workers', MAX_WORKERS);
// Track active workers
const activeWorkers = new Map();

// In-memory store for scheduled jobs
const jobs = new Map();

/**
 * Call an API endpoint using a worker thread
 * @param {Object} job - The job configuration
 * @returns {Promise<Object>} - The response from the API
 */
const callEndpoint = async (job) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if we're at maximum workers
      if (activeWorkers.size >= MAX_WORKERS) {
        logger.warn(`Maximum worker count (${MAX_WORKERS}) reached. Job ${job.name} (${job.id}) will execute when a worker becomes available.`);
      }
      
      // Create a worker thread to execute the job
      const worker = new Worker(path.join(__dirname, '../../workers/job.worker.js'), {
        workerData: {
          id: job.id,
          name: job.name,
          url: job.apiUrl || job.url, // Support both apiUrl (DB format) and url (legacy format)
          method: job.method,
          headers: job.headers,
          body: job.body,
          targetServiceClientId: job.targetServiceClientId,
          targetServiceSecret: job.targetServiceSecret
        }
      });
      
      // Add to active workers map
      activeWorkers.set(job.id, worker);
      
      // Setup timeout to kill worker if it takes too long
      const timeoutId = setTimeout(() => {
        if (activeWorkers.has(job.id)) {
          logger.error(`Job ${job.name} (${job.id}) timed out after ${DEFAULT_TIMEOUT}ms`);
          worker.terminate();
          activeWorkers.delete(job.id);
          
          // Update job execution stats in memory
          if (jobs.has(job.id)) {
            const memoryJob = jobs.get(job.id);
            memoryJob.lastRun = new Date();
            memoryJob.lastRunStatus = 'error';
            memoryJob.lastRunError = 'Execution timed out';
            memoryJob.executionCount = (memoryJob.executionCount || 0) + 1;
            memoryJob.errorCount = (memoryJob.errorCount || 0) + 1;
            jobs.set(job.id, memoryJob);
          }
          
          // Update job execution stats in database via repository
          jobRepository.updateJobExecutionStats(job.id, {
            lastRun: new Date(),
            lastRunStatus: 'error',
            lastRunError: 'Execution timed out',
            executionCount: job.executionCount ? job.executionCount + 1 : 1,
            errorCount: job.errorCount ? job.errorCount + 1 : 1
          }).catch(err => {
            logger.error(`Failed to update job stats in database: ${err.message}`);
          });
          
          reject(new Error('Job execution timed out'));
        }
      }, DEFAULT_TIMEOUT);
      
      // Listen for messages from the worker
      worker.on('message', (result) => {
        clearTimeout(timeoutId);
        activeWorkers.delete(job.id);
        
        // Update job execution stats
        const now = new Date();
        
        if (result.success) {
          logger.info(`Job ${job.name} (${job.id}) completed in ${result.duration}ms with status ${result.status}`);
          
          // Update job in memory if it exists
          if (jobs.has(job.id)) {
            const memoryJob = jobs.get(job.id);
            memoryJob.lastRun = now;
            memoryJob.lastRunStatus = 'success';
            memoryJob.lastRunDuration = result.duration;
            memoryJob.lastRunStatusCode = result.status;
            memoryJob.executionCount = (memoryJob.executionCount || 0) + 1;
            jobs.set(job.id, memoryJob);
          }
          
          // Update job in database via repository
          jobRepository.updateJobExecutionStats(job.id, {
            lastRun: now,
            lastRunStatus: 'success',
            lastRunError: null,
            executionCount: job.executionCount ? job.executionCount + 1 : 1
          }).catch(err => {
            logger.error(`Failed to update job stats in database: ${err.message}`);
          });
          
          resolve({
            status: result.status,
            data: result.data,
            duration: result.duration
          });
        } else {
          logger.error(`Job ${job.name} (${job.id}) failed: ${result.error}`);
          
          // Update job in memory if it exists
          if (jobs.has(job.id)) {
            const memoryJob = jobs.get(job.id);
            memoryJob.lastRun = now;
            memoryJob.lastRunStatus = 'error';
            memoryJob.lastRunError = result.error;
            memoryJob.lastRunStatusCode = result.status;
            memoryJob.executionCount = (memoryJob.executionCount || 0) + 1;
            memoryJob.errorCount = (memoryJob.errorCount || 0) + 1;
            jobs.set(job.id, memoryJob);
          }
          
          // Update job in database via repository
          jobRepository.updateJobExecutionStats(job.id, {
            lastRun: now,
            lastRunStatus: 'error',
            lastRunError: result.error,
            executionCount: job.executionCount ? job.executionCount + 1 : 1,
            errorCount: job.errorCount ? job.errorCount + 1 : 1
          }).catch(err => {
            logger.error(`Failed to update job stats in database: ${err.message}`);
          });
          
          reject(new Error(result.error));
        }
      });
      
      // Handle worker errors
      worker.on('error', (error) => {
        clearTimeout(timeoutId);
        activeWorkers.delete(job.id);
        
        logger.error(`Worker error in job ${job.name} (${job.id}): ${error.message}`);
        
        // Update job in memory if it exists
        if (jobs.has(job.id)) {
          const memoryJob = jobs.get(job.id);
          memoryJob.lastRun = new Date();
          memoryJob.lastRunStatus = 'error';
          memoryJob.lastRunError = `Worker error: ${error.message}`;
          memoryJob.executionCount = (memoryJob.executionCount || 0) + 1;
          memoryJob.errorCount = (memoryJob.errorCount || 0) + 1;
          jobs.set(job.id, memoryJob);
        }
        
        // Update job in database via repository
        jobRepository.updateJobExecutionStats(job.id, {
          lastRun: new Date(),
          lastRunStatus: 'error',
          lastRunError: `Worker error: ${error.message}`,
          executionCount: job.executionCount ? job.executionCount + 1 : 1,
          errorCount: job.errorCount ? job.errorCount + 1 : 1
        }).catch(err => {
          logger.error(`Failed to update job stats in database: ${err.message}`);
        });
        
        reject(error);
      });
      
      // Handle worker exit
      worker.on('exit', (code) => {
        clearTimeout(timeoutId);
        activeWorkers.delete(job.id);
        
        if (code !== 0) {
          logger.error(`Worker for job ${job.name} (${job.id}) exited with code ${code}`);
        }
      });
    } catch (error) {
      logger.error(`Failed to create worker for job ${job.name} (${job.id}): ${error.message}`);
      
      // Update job in memory if it exists
      if (jobs.has(job.id)) {
        const memoryJob = jobs.get(job.id);
        memoryJob.lastRun = new Date();
        memoryJob.lastRunStatus = 'error';
        memoryJob.lastRunError = `Failed to create worker: ${error.message}`;
        memoryJob.executionCount = (memoryJob.executionCount || 0) + 1;
        memoryJob.errorCount = (memoryJob.errorCount || 0) + 1;
        jobs.set(job.id, memoryJob);
      }
      
      // Update job in database via repository
      jobRepository.updateJobExecutionStats(job.id, {
        lastRun: new Date(),
        lastRunStatus: 'error',
        lastRunError: `Failed to create worker: ${error.message}`,
        executionCount: job.executionCount ? job.executionCount + 1 : 1,
        errorCount: job.errorCount ? job.errorCount + 1 : 1
      }).catch(err => {
        logger.error(`Failed to update job stats in database: ${err.message}`);
      });
      
      reject(error);
    }
  });
};

/**
 * Schedule a job with node-cron, supporting timezones
 * @param {Object} job - The job configuration
 * @returns {Object} - The scheduled job
 */
const scheduleJob = (job) => {
  // Get the cron expression from the job (either interval for DB jobs or cronExpression for legacy)
  const cronExpression = job.interval || job.cronExpression;

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }
  
  // Configure timezone if specified
  const options = {
    scheduled: job.enabled
  };

  // Add timezone if specified and valid
  if (job.timezone) {
    try {
      options.timezone = job.timezone;
    } catch (error) {
      logger.warn(`Invalid timezone (${job.timezone}) for job ${job.name} (${job.id}). Using system timezone.`);
    }
  }

  // Schedule the job
  const task = cron.schedule(cronExpression, async () => {
    try {
      await callEndpoint(job);
    } catch (error) {
      logger.error(`Error in scheduled job ${job.name} (${job.id}): ${error.message}`);
    }
  }, options);
  
  // Store the task instance with the job
  job.task = task;
  
  return job;
};

/**
 * Initialize the scheduler service
 * Loads jobs from database and schedules them
 */
exports.initializeScheduler = async () => {
  logger.info(`Initializing scheduler service with max ${MAX_WORKERS} worker threads`);
  
  try {
    // Get all active jobs from the database via repository
    const dbJobs = await jobRepository.findEnabledJobs();
    
    if (dbJobs.length > 0) {
      logger.info(`Found ${dbJobs.length} jobs in database`);
      
      // Schedule each job
      for (const job of dbJobs) {
        try {
          // Schedule the job
          const scheduledJob = scheduleJob(job);
          jobs.set(scheduledJob.id, scheduledJob);
          
          logger.info(`Scheduled job: ${job.name} (${job.id})`);
        } catch (error) {
          logger.error(`Failed to schedule job ${job.id}: ${error.message}`);
        }
      }
    } else {
      logger.info('No jobs found in database');
    }
  } catch (error) {
    logger.error(`Failed to load jobs from database: ${error.message}`);
  }
};

/**
 * Get all scheduled jobs
 * @returns {Array} - Array of all jobs (without the task instance)
 */
exports.getAllJobs = () => {
  return Array.from(jobs.values()).map(job => {
    const { task, ...jobWithoutTask } = job;
    return jobWithoutTask;
  });
};

/**
 * Create a new scheduled job from database record
 * @param {Object} dbJob - The job data from database
 * @returns {Object} - The created job (without the task instance)
 */
exports.createJobFromDb = async (dbJob) => {
  // Schedule the job
  const scheduledJob = scheduleJob(dbJob);
  
  // Store the job
  jobs.set(dbJob.id, scheduledJob);
  
  // Return the job without the task instance
  const { task, ...jobWithoutTask } = scheduledJob;
  return jobWithoutTask;
};

/**
 * Update a scheduled job from database record
 * @param {Object} dbJob - The updated job from database
 * @returns {Object} - The updated job (without the task instance)
 */
exports.updateJobFromDb = async (dbJob) => {
  const job = jobs.get(dbJob.id);
  
  if (!job) {
    // Job doesn't exist in memory, schedule it
    return await exports.createJobFromDb(dbJob);
  }
  
  // Stop the current cron job
  job.task.stop();
  
  // Update the job data in memory with database values
  const updatedJob = {
    ...job,
    name: dbJob.name,
    apiUrl: dbJob.apiUrl,
    method: dbJob.method,
    headers: dbJob.headers,
    body: dbJob.body,
    interval: dbJob.interval,
    timezone: dbJob.timezone,
    enabled: dbJob.enabled,
    lastRun: dbJob.lastRun,
    lastRunStatus: dbJob.lastRunStatus,
    lastRunError: dbJob.lastRunError,
    executionCount: dbJob.executionCount,
    errorCount: dbJob.errorCount,
    updatedAt: dbJob.updatedAt,
    updatedBy: dbJob.updatedBy
  };
  
  // Re-schedule the job
  const scheduledJob = scheduleJob(updatedJob);
  
  // Update the job in the store
  jobs.set(dbJob.id, scheduledJob);
  
  // Return the job without the task instance
  const { task, ...jobWithoutTask } = scheduledJob;
  return jobWithoutTask;
};

// Alias for updateJobFromDb for compatibility
exports.updateJob = exports.updateJobFromDb;

/**
 * Get a scheduled job by ID
 * @param {string} id - The job ID
 * @returns {Object} - The job (without the task instance)
 */
exports.getJobById = (id) => {
  const job = jobs.get(id);
  
  if (!job) {
    return null;
  }
  
  // Return the job without the task instance
  const { task, ...jobWithoutTask } = job;
  return jobWithoutTask;
};

/**
 * Delete a scheduled job
 * @param {string} id - The job ID
 * @returns {boolean} - Whether the deletion was successful
 */
exports.deleteJob = (id) => {
  const job = jobs.get(id);
  
  if (!job) {
    return false;
  }
  
  // Stop the cron job
  job.task.stop();
  
  // Terminate any running worker for this job
  if (activeWorkers.has(id)) {
    const worker = activeWorkers.get(id);
    worker.terminate();
    activeWorkers.delete(id);
  }
  
  // Remove the job from the store
  jobs.delete(id);
  
  return true;
};

/**
 * Pause a scheduled job
 * @param {string} id - The job ID
 * @returns {boolean} - Whether the pause was successful
 */
exports.pauseJob = (id) => {
  const job = jobs.get(id);
  
  if (!job) {
    return false;
  }
  
  // Stop the cron job
  job.task.stop();
  
  // Terminate any running worker for this job
  if (activeWorkers.has(id)) {
    const worker = activeWorkers.get(id);
    worker.terminate();
    activeWorkers.delete(id);
    logger.info(`Terminated active worker for paused job ${job.name} (${job.id})`);
  }
  
  // Update the job status in memory
  job.enabled = false;
  
  return true;
};

/**
 * Resume a scheduled job
 * @param {string} id - The job ID
 * @returns {boolean} - Whether the resume was successful
 */
exports.resumeJob = (id) => {
  const job = jobs.get(id);
  
  if (!job) {
    return false;
  }
  
  // Start the cron job
  job.task.start();
  
  // Update the job status in memory
  job.enabled = true;
  
  return true;
};

/**
 * Run a scheduled job immediately
 * @param {string} id - The job ID
 * @returns {Promise<Object>} - The result of the job execution
 */
exports.runJobNow = async (id) => {
  const job = jobs.get(id);
  
  if (!job) {
    return null;
  }
  
  try {
    // Call the endpoint
    return await callEndpoint(job);
  } catch (error) {
    logger.error(`Error executing job ${job.name} (${job.id}): ${error.message}`);
    throw error;
  }
};

/**
 * Clear all jobs (for testing purposes only)
 * NOT FOR PRODUCTION USE
 */
exports.clearJobsForTesting = () => {
  // Stop all cron jobs and terminate all workers
  for (const job of jobs.values()) {
    if (job.task) {
      job.task.stop();
    }
    
    if (activeWorkers.has(job.id)) {
      const worker = activeWorkers.get(job.id);
      worker.terminate();
      activeWorkers.delete(job.id);
    }
  }
  
  // Clear the jobs map
  jobs.clear();
  
  logger.info('Cleared all jobs and terminated all workers for testing');
};

/**
 * Get worker thread status
 * @returns {Object} - Information about worker threads
 */
exports.getWorkerStatus = () => {
  return {
    maxWorkers: MAX_WORKERS,
    activeWorkers: activeWorkers.size,
    activeJobIds: Array.from(activeWorkers.keys())
  };
}; 