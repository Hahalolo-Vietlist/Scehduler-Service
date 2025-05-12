const schedulerService = require('./scheduler.service');
const jobRepository = require('./scheduler.repo');
const logger = require('../../utils/logger');

/**
 * Get all scheduled jobs
 */
exports.getAllJobs = async (req, res) => {
  try {
    // Get all jobs from the repository
    const jobs = await jobRepository.findAllJobs();
    
    // Convert the database jobs to the format expected by the client
    const formattedJobs = jobs.map(job => ({
      id: job.id,
      name: job.name,
      apiUrl: job.apiUrl,
      method: job.method,
      headers: job.headers,
      body: job.body,
      interval: job.interval,
      timezone: job.timezone,
      enabled: job.enabled,
      lastRun: job.lastRun,
      lastRunStatus: job.lastRunStatus,
      lastRunError: job.lastRunError,
      executionCount: job.executionCount,
      errorCount: job.errorCount,
      targetServiceClientId: job.targetServiceClientId,
      createdBy: job.createdBy,
      updatedBy: job.updatedBy,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt
    }));
    
    return res.status(200).json({
      success: true,
      data: formattedJobs
    });
  } catch (error) {
    logger.error(`Error getting all jobs: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get scheduled jobs',
        details: error.message
      }
    });
  }
};

/**
 * Create a new scheduled job
 */
exports.createJob = async (req, res) => {
  try {
    const { 
      name, 
      apiUrl, 
      interval, 
      timezone = 'UTC', 
      method = 'GET', 
      headers = {}, 
      body = {}, 
      enabled = true,
      targetServiceClientId,
      targetServiceSecret
    } = req.body;
    
    // Validate required fields
    if (!name || !apiUrl || !interval) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Missing required fields',
          details: 'name, apiUrl, and interval are required'
        }
      });
    }
    
    // Get user information from authentication middleware
    // In a real implementation, this would come from the user authentication
    const createdBy = req.user?.name || 'admin';
    
    // Create the job in the database via repository
    const newJob = await jobRepository.createJob({
      name,
      apiUrl,
      method,
      headers,
      body,
      interval,
      timezone,
      enabled,
      targetServiceClientId,
      targetServiceSecret,
      createdBy
    });
    
    // Schedule the job using the service
    const scheduledJob = await schedulerService.createJobFromDb(newJob);
    
    // Don't expose the secret in the response
    const jobResponse = {
      ...scheduledJob,
      targetServiceSecret: undefined
    };
    
    return res.status(201).json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    logger.error(`Error creating job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to create scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Get a scheduled job by ID
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the job in the database via repository
    const job = await jobRepository.findJobById(id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Don't expose the secret in the response
    const jobResponse = {
      ...job,
      targetServiceSecret: undefined
    };
    
    return res.status(200).json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    logger.error(`Error getting job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Update a scheduled job
 */
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, 
      apiUrl, 
      interval, 
      timezone, 
      method, 
      headers, 
      body, 
      enabled,
      targetServiceClientId,
      targetServiceSecret
    } = req.body;
    
    // Check if the job exists via repository
    const existingJob = await jobRepository.findJobById(id);
    
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Get user information for updatedBy field
    const updatedBy = req.user?.name || 'admin';
    
    // Prepare update data
    const updateData = {
      updatedBy,
      ...(name !== undefined && { name }),
      ...(apiUrl !== undefined && { apiUrl }),
      ...(method !== undefined && { method }),
      ...(headers !== undefined && { headers }),
      ...(body !== undefined && { body }),
      ...(interval !== undefined && { interval }),
      ...(timezone !== undefined && { timezone }),
      ...(enabled !== undefined && { enabled }),
      ...(targetServiceClientId !== undefined && { targetServiceClientId }),
      ...(targetServiceSecret !== undefined && { targetServiceSecret })
    };
    
    // Update the job in the database via repository
    const updatedJob = await jobRepository.updateJob(id, updateData);
    
    // Update the job in the scheduler service
    if (updatedJob.enabled) {
      await schedulerService.updateJob(updatedJob);
    } else {
      await schedulerService.pauseJob(id);
    }
    
    // Don't expose the secret in the response
    const jobResponse = {
      ...updatedJob,
      targetServiceSecret: undefined
    };
    
    return res.status(200).json({
      success: true,
      data: jobResponse
    });
  } catch (error) {
    logger.error(`Error updating job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Delete a scheduled job
 */
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the job exists via repository
    const existingJob = await jobRepository.findJobById(id);
    
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Stop the job in the scheduler service
    await schedulerService.deleteJob(id);
    
    // Delete the job from the database via repository
    await jobRepository.deleteJob(id);
    
    return res.status(200).json({
      success: true,
      data: { message: 'Job deleted successfully' }
    });
  } catch (error) {
    logger.error(`Error deleting job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to delete scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Pause a scheduled job
 */
exports.pauseJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user?.name || 'admin';
    
    // Check if the job exists via repository
    const existingJob = await jobRepository.findJobById(id);
    
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Pause the job in the scheduler service
    const result = await schedulerService.pauseJob(id);
    
    if (!result) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to pause job',
          details: 'Job was not found in the scheduler'
        }
      });
    }
    
    // Update the job in the database via repository
    await jobRepository.updateJob(id, {
      enabled: false,
      updatedBy
    });
    
    return res.status(200).json({
      success: true,
      data: { message: 'Job paused successfully' }
    });
  } catch (error) {
    logger.error(`Error pausing job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to pause scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Resume a scheduled job
 */
exports.resumeJob = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user?.name || 'admin';
    
    // Check if the job exists via repository
    const existingJob = await jobRepository.findJobById(id);
    
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Resume the job in the scheduler service
    const result = await schedulerService.resumeJob(id);
    
    if (!result) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to resume job',
          details: 'Job was not found in the scheduler'
        }
      });
    }
    
    // Update the job in the database via repository
    await jobRepository.updateJob(id, {
      enabled: true,
      updatedBy
    });
    
    return res.status(200).json({
      success: true,
      data: { message: 'Job resumed successfully' }
    });
  } catch (error) {
    logger.error(`Error resuming job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to resume scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Run a scheduled job immediately
 */
exports.runJobNow = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the job exists via repository
    const existingJob = await jobRepository.findJobById(id);
    
    if (!existingJob) {
      return res.status(404).json({
        success: false,
        error: {
          message: 'Job not found',
          details: `No job exists with id: ${id}`
        }
      });
    }
    
    // Run the job immediately via service
    const result = await schedulerService.runJobNow(id);
    
    if (!result) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Failed to run job',
          details: 'Job was not found in the scheduler'
        }
      });
    }
    
    return res.status(200).json({
      success: true,
      data: { 
        message: 'Job executed successfully',
        executionResult: result
      }
    });
  } catch (error) {
    logger.error(`Error executing job: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to execute scheduled job',
        details: error.message
      }
    });
  }
};

/**
 * Get worker thread status
 */
exports.getWorkerStatus = async (req, res) => {
  try {
    const workerStatus = schedulerService.getWorkerStatus();
    
    return res.status(200).json({
      success: true,
      data: workerStatus
    });
  } catch (error) {
    logger.error(`Error getting worker status: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: {
        message: 'Failed to get worker thread status',
        details: error.message
      }
    });
  }
}; 