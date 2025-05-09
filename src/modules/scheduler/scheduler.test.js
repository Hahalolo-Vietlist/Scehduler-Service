const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// Mock the modules we'll use
jest.mock('axios');
jest.mock('node-cron');
jest.mock('uuid');

// Import the scheduler service
const schedulerService = require('./scheduler.service');

describe('Scheduler Service', () => {
  // Setup stubs and mocks before each test
  beforeEach(() => {
    // Mock UUID generation to return a predictable ID
    uuidv4.mockReturnValue('test-job-id');
    
    // Mock cron.schedule to return a task object with start and stop methods
    cron.schedule.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn()
    });
    
    // Mock cron.validate to return true for valid expressions
    cron.validate.mockImplementation((expr) => {
      return expr === '* * * * *'; // Consider '* * * * *' as valid
    });
    
    // Mock axios for API calls
    axios.mockResolvedValue({
      status: 200,
      data: { success: true }
    });
    
    // Clear the jobs map between tests
    // This requires making the jobs Map accessible for testing
    // For the tests to work, you might need to expose the jobs Map in the service
    // or create a method to clear it for testing
    if (schedulerService.clearJobsForTesting) {
      schedulerService.clearJobsForTesting();
    }
  });
  
  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createJob', () => {
    it('should create a new job with the provided configuration', () => {
      // Given a job configuration
      const jobConfig = {
        name: 'Test Job',
        cronExpression: '* * * * *',
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: { 'X-API-Key': 'test-key' },
        body: { test: true },
        enabled: true
      };
      
      // When creating a new job
      const result = schedulerService.createJob(jobConfig);
      
      // Then the job should be created with the expected properties
      expect(result).to.have.property('id', 'test-job-id');
      expect(result).to.have.property('name', 'Test Job');
      expect(result).to.have.property('cronExpression', '* * * * *');
      expect(result).to.have.property('url', 'https://api.example.com/test');
      expect(result).to.have.property('method', 'GET');
      expect(result).to.have.property('enabled', true);
      expect(result.headers).to.deep.equal({ 'X-API-Key': 'test-key' });
      expect(result.body).to.deep.equal({ test: true });
      
      // Verify node-cron was called with the correct parameters
      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
        { scheduled: true }
      );
    });
    
    it('should throw an error for invalid cron expression', () => {
      // Given an invalid cron expression
      const jobConfig = {
        name: 'Invalid Job',
        cronExpression: 'invalid-expression',
        url: 'https://api.example.com/test'
      };
      
      // When creating a job with invalid cron expression, it should throw an error
      expect(() => schedulerService.createJob(jobConfig)).to.throw('Invalid cron expression');
    });
  });
  
  describe('getAllJobs', () => {
    it('should return all scheduled jobs', () => {
      // Given two jobs have been created
      schedulerService.createJob({
        name: 'Job 1',
        cronExpression: '* * * * *',
        url: 'https://api.example.com/test1'
      });
      
      schedulerService.createJob({
        name: 'Job 2',
        cronExpression: '* * * * *',
        url: 'https://api.example.com/test2'
      });
      
      // When getting all jobs
      const jobs = schedulerService.getAllJobs();
      
      // Then it should return an array of two jobs
      expect(jobs).to.be.an('array').with.lengthOf(2);
      expect(jobs[0]).to.have.property('name', 'Job 1');
      expect(jobs[1]).to.have.property('name', 'Job 2');
      
      // Ensure the task property is not returned
      expect(jobs[0]).to.not.have.property('task');
      expect(jobs[1]).to.not.have.property('task');
    });
  });
  
  describe('getJobById', () => {
    it('should return a job when given a valid ID', () => {
      // Given a job has been created
      schedulerService.createJob({
        name: 'Test Job',
        cronExpression: '* * * * *',
        url: 'https://api.example.com/test'
      });
      
      // When getting the job by ID
      const job = schedulerService.getJobById('test-job-id');
      
      // Then it should return the job
      expect(job).to.not.be.null;
      expect(job).to.have.property('name', 'Test Job');
      expect(job).to.not.have.property('task');
    });
    
    it('should return null for non-existent job ID', () => {
      // When getting a non-existent job
      const job = schedulerService.getJobById('non-existent-id');
      
      // Then it should return null
      expect(job).to.be.null;
    });
  });
  
  describe('runJobNow', () => {
    it('should execute a job immediately when called', async () => {
      // Given a job has been created
      schedulerService.createJob({
        name: 'Test Job',
        cronExpression: '* * * * *',
        url: 'https://api.example.com/test',
        method: 'GET'
      });
      
      // When running the job immediately
      const result = await schedulerService.runJobNow('test-job-id');
      
      // Then it should call the endpoint and return the result
      expect(axios).toHaveBeenCalledWith({
        url: 'https://api.example.com/test',
        method: 'GET',
        headers: undefined,
        data: undefined,
        params: undefined,
        timeout: 30000
      });
      
      expect(result).to.have.property('status', 200);
      expect(result).to.have.property('data').that.deep.equals({ success: true });
    });
    
    it('should return null for non-existent job ID', async () => {
      // When running a non-existent job
      const result = await schedulerService.runJobNow('non-existent-id');
      
      // Then it should return null
      expect(result).to.be.null;
    });
  });
}); 