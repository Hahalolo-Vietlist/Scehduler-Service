/**
 * @swagger
 * components:
 *   schemas:
 *     Job:
 *       type: object
 *       required:
 *         - name
 *         - apiUrl
 *         - interval
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated UUID of the job
 *         name:
 *           type: string
 *           description: The name of the scheduled job
 *         apiUrl:
 *           type: string
 *           description: The URL to call
 *         method:
 *           type: string
 *           description: HTTP method to use
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         headers:
 *           type: object
 *           description: HTTP headers to include
 *         body:
 *           type: object
 *           description: Request body for POST/PUT/PATCH methods
 *         interval:
 *           type: string
 *           description: Cron expression for scheduling
 *         timezone:
 *           type: string
 *           description: Timezone for job execution
 *         enabled:
 *           type: boolean
 *           description: Whether the job is active
 *         lastRun:
 *           type: string
 *           format: date-time
 *           description: When the job was last run
 *         lastRunStatus:
 *           type: string
 *           description: Status of the last run
 *         lastRunError:
 *           type: string
 *           description: Error message from the last run
 *         executionCount:
 *           type: integer
 *           description: Number of times the job has run
 *         errorCount:
 *           type: integer
 *           description: Number of times the job has failed
 *         targetServiceClientId:
 *           type: string
 *           description: Client ID for target service authentication
 *         targetServiceSecret:
 *           type: string
 *           description: Secret for target service authentication (not returned in responses)
 *         createdBy:
 *           type: string
 *           description: Who created the job
 *         updatedBy:
 *           type: string
 *           description: Who last updated the job
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the job was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the job was last updated
 *       example:
 *         id: j5fE_btz
 *         name: Daily Report
 *         apiUrl: https://api.example.com/reports
 *         method: POST
 *         headers: { "Content-Type": "application/json" }
 *         body: { "reportType": "daily" }
 *         interval: 0 0 * * *
 *         timezone: UTC
 *         enabled: true
 *         executionCount: 5
 *         errorCount: 0
 *         targetServiceClientId: "client_a1b2c3d4e5f6"
 *         createdBy: Admin User
 *         createdAt: 2023-01-01T12:00:00.000Z
 *         updatedAt: 2023-01-01T12:00:00.000Z
 */

/**
 * @swagger
 * tags:
 *   - name: Jobs
 *     description: Job scheduling
 *   - name: Workers
 *     description: Worker thread management
 */

/**
 * @swagger
 * /api/v1/scheduler:
 *   get:
 *     summary: Get all scheduled jobs
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: The list of scheduled jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *       500:
 *         description: Server error
 *   post:
 *     summary: Create a new scheduled job
 *     tags: [Jobs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - apiUrl
 *               - interval
 *             properties:
 *               name:
 *                 type: string
 *               apiUrl:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               headers:
 *                 type: object
 *               body:
 *                 type: object
 *               interval:
 *                 type: string
 *               timezone:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               targetServiceClientId:
 *                 type: string
 *               targetServiceSecret:
 *                 type: string
 *     responses:
 *       201:
 *         description: The job was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/scheduler/{id}:
 *   get:
 *     summary: Get a scheduled job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 *   put:
 *     summary: Update a scheduled job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               apiUrl:
 *                 type: string
 *               method:
 *                 type: string
 *                 enum: [GET, POST, PUT, DELETE, PATCH]
 *               headers:
 *                 type: object
 *               body:
 *                 type: object
 *               interval:
 *                 type: string
 *               timezone:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               targetServiceClientId:
 *                 type: string
 *               targetServiceSecret:
 *                 type: string
 *     responses:
 *       200:
 *         description: The job was successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 *   delete:
 *     summary: Delete a scheduled job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The job was successfully deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/scheduler/{id}/pause:
 *   patch:
 *     summary: Pause a scheduled job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The job was successfully paused
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/scheduler/{id}/resume:
 *   patch:
 *     summary: Resume a scheduled job
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The job was successfully resumed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/scheduler/{id}/run:
 *   post:
 *     summary: Run a scheduled job immediately
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The job ID
 *     responses:
 *       200:
 *         description: The job was successfully executed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                     executionResult:
 *                       type: object
 *       404:
 *         description: Job not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/v1/scheduler/status/workers:
 *   get:
 *     summary: Get worker thread status
 *     tags: [Workers]
 *     responses:
 *       200:
 *         description: The worker thread status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     maxWorkers:
 *                       type: integer
 *                     activeWorkers:
 *                       type: integer
 *                     activeJobIds:
 *                       type: array
 *                       items:
 *                         type: string
 *       500:
 *         description: Server error
 */
