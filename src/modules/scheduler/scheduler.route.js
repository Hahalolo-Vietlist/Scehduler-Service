const express = require('express');
const router = express.Router();
const schedulerController = require('./scheduler.controller');
const authenticate = require('../../middleware/auth/authMiddleware');
const checkRole = require('../../middleware/auth/checkRole');

// Admin authentication middleware
// router.use(authenticate);
// router.use(checkRole({
//     allowedRoles: ["admin", "super_admin"],
//     requireActiveSubscription: false,
//     requiredPermissions: ["add", "all"] 
// }));

/**
 * @route GET /api/v1/scheduler
 * @desc Get all scheduled jobs
 */
router.get('/', schedulerController.getAllJobs);

/**
 * @route POST /api/v1/scheduler
 * @desc Create a new scheduled job
 */
router.post('/', schedulerController.createJob);

/**
 * @route GET /api/v1/scheduler/status/workers
 * @desc Get the status of worker threads
 */
router.get('/status/workers', schedulerController.getWorkerStatus);

/**
 * @route GET /api/v1/scheduler/:id
 * @desc Get a scheduled job by ID
 */
router.get('/:id', schedulerController.getJobById);

/**
 * @route PUT /api/v1/scheduler/:id
 * @desc Update a scheduled job
 */
router.put('/:id', schedulerController.updateJob);

/**
 * @route DELETE /api/v1/scheduler/:id
 * @desc Delete a scheduled job
 */
router.delete('/:id', schedulerController.deleteJob);

/**
 * @route PATCH /api/v1/scheduler/:id/pause
 * @desc Pause a scheduled job
 */
router.patch('/:id/pause', schedulerController.pauseJob);

/**
 * @route PATCH /api/v1/scheduler/:id/resume
 * @desc Resume a scheduled job
 */
router.patch('/:id/resume', schedulerController.resumeJob);

/**
 * @route POST /api/v1/scheduler/:id/run
 * @desc Run a scheduled job immediately
 */
router.post('/:id/run', schedulerController.runJobNow);

module.exports = router; 