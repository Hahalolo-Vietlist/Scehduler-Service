const prisma = require('../../config/db');
const logger = require('../../utils/logger');

/**
 * Get all jobs from the database
 * @returns {Promise<Array>} - All jobs
 */
exports.findAllJobs = async () => {
  try {
    return await prisma.job.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
  } catch (error) {
    logger.error(`Repository error getting all jobs: ${error.message}`);
    throw error;
  }
};

/**
 * Get a job by ID
 * @param {string} id - Job ID
 * @returns {Promise<Object>} - The job or null
 */
exports.findJobById = async (id) => {
  try {
    return await prisma.job.findUnique({
      where: { id }
    });
  } catch (error) {
    logger.error(`Repository error getting job by ID: ${error.message}`);
    throw error;
  }
};

/**
 * Create a new job
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>} - The created job
 */
exports.createJob = async (jobData) => {
  try {
    return await prisma.job.create({
      data: jobData
    });
  } catch (error) {
    logger.error(`Repository error creating job: ${error.message}`);
    throw error;
  }
};

/**
 * Update a job
 * @param {string} id - Job ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - The updated job
 */
exports.updateJob = async (id, data) => {
  try {
    return await prisma.job.update({
      where: { id },
      data
    });
  } catch (error) {
    logger.error(`Repository error updating job: ${error.message}`);
    throw error;
  }
};

/**
 * Delete a job
 * @param {string} id - Job ID
 * @returns {Promise<Object>} - The deleted job
 */
exports.deleteJob = async (id) => {
  try {
    return await prisma.job.delete({
      where: { id }
    });
  } catch (error) {
    logger.error(`Repository error deleting job: ${error.message}`);
    throw error;
  }
};

/**
 * Update job execution stats
 * @param {string} id - Job ID
 * @param {Object} stats - Stats to update
 * @returns {Promise<Object>} - The updated job
 */
exports.updateJobExecutionStats = async (id, stats) => {
  try {
    return await prisma.job.update({
      where: { id },
      data: stats
    });
  } catch (error) {
    logger.error(`Repository error updating job stats: ${error.message}`);
    throw error;
  }
};

/**
 * Find all enabled jobs
 * @returns {Promise<Array>} - All enabled jobs
 */
exports.findEnabledJobs = async () => {
  try {
    return await prisma.job.findMany({
      where: {
        enabled: true
      }
    });
  } catch (error) {
    logger.error(`Repository error finding enabled jobs: ${error.message}`);
    throw error;
  }
};
