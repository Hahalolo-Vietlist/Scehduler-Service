const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const axios = require('axios');

// Mocking the modules
jest.mock('axios');
jest.mock('worker_threads', () => {
  return {
    parentPort: {
      postMessage: jest.fn()
    },
    workerData: null,
    isMainThread: true
  };
});

describe('Job Worker Tests', () => {
  // Setup before each test
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Mock workerData for the worker
    require('worker_threads').workerData = {
      id: 'test-job-id',
      name: 'Test Job',
      url: 'https://api.example.com/test',
      method: 'GET',
      headers: { 'X-API-Key': 'test-key' },
      body: { test: true }
    };
  });

  it('should execute a job successfully and post the result to the parent thread', async () => {
    // Mock a successful axios response
    axios.mockResolvedValueOnce({
      status: 200,
      data: { success: true, message: 'Test successful' }
    });
    
    // Load the worker script
    require('../workers/job.worker');
    
    // Let the async operation complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify axios was called with the correct parameters
    expect(axios).toHaveBeenCalledWith({
      url: 'https://api.example.com/test',
      method: 'GET',
      headers: { 'X-API-Key': 'test-key' },
      params: { test: true },
      data: undefined,
      timeout: 30000
    });
    
    // Verify the result was posted to the parent thread
    const postMessage = require('worker_threads').parentPort.postMessage;
    expect(postMessage).toHaveBeenCalledTimes(1);
    
    const postedMessage = postMessage.mock.calls[0][0];
    expect(postedMessage.success).toBe(true);
    expect(postedMessage.status).toBe(200);
    expect(postedMessage.jobId).toBe('test-job-id');
    expect(postedMessage.jobName).toBe('Test Job');
    expect(postedMessage.data).toEqual({ success: true, message: 'Test successful' });
  });

  it('should handle job execution errors and post the error to the parent thread', async () => {
    // Mock an axios error
    const error = new Error('API request failed');
    error.response = { status: 500 };
    axios.mockRejectedValueOnce(error);
    
    // Load the worker script
    require('../workers/job.worker');
    
    // Let the async operation complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify the error was posted to the parent thread
    const postMessage = require('worker_threads').parentPort.postMessage;
    expect(postMessage).toHaveBeenCalledTimes(1);
    
    const postedMessage = postMessage.mock.calls[0][0];
    expect(postedMessage.success).toBe(false);
    expect(postedMessage.error).toBe('API request failed');
    expect(postedMessage.status).toBe(500);
    expect(postedMessage.jobId).toBe('test-job-id');
    expect(postedMessage.jobName).toBe('Test Job');
  });

  it('should handle POST requests with body instead of query parameters', async () => {
    // Set up worker data for a POST request
    require('worker_threads').workerData = {
      id: 'test-post-job',
      name: 'Test POST Job',
      url: 'https://api.example.com/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { name: 'test', value: 123 }
    };
    
    // Mock a successful axios response
    axios.mockResolvedValueOnce({
      status: 201,
      data: { id: 'new-resource-id' }
    });
    
    // Load the worker script
    require('../workers/job.worker');
    
    // Let the async operation complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify axios was called with the correct parameters
    expect(axios).toHaveBeenCalledWith({
      url: 'https://api.example.com/create',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      params: undefined,
      data: { name: 'test', value: 123 },
      timeout: 30000
    });
    
    // Verify the result was posted
    const postMessage = require('worker_threads').parentPort.postMessage;
    const postedMessage = postMessage.mock.calls[0][0];
    expect(postedMessage.status).toBe(201);
  });

  it('should include target service credentials in headers when provided', async () => {
    // Set up worker data with target service credentials
    require('worker_threads').workerData = {
      id: 'test-auth-job',
      name: 'Test Auth Job',
      url: 'https://api.example.com/secure',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: { test: true },
      targetServiceClientId: 'client_a1b2c3d4e5f6',
      targetServiceSecret: 'secret_z9y8x7w6v5u4'
    };
    
    // Mock a successful axios response
    axios.mockResolvedValueOnce({
      status: 200,
      data: { success: true }
    });
    
    // Load the worker script
    require('../workers/job.worker');
    
    // Let the async operation complete
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Verify axios was called with the correct parameters including credentials
    expect(axios).toHaveBeenCalledWith({
      url: 'https://api.example.com/secure',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': 'client_a1b2c3d4e5f6',
        'x-client-secret': 'secret_z9y8x7w6v5u4'
      },
      params: { test: true },
      data: undefined,
      timeout: 30000
    });
    
    // Verify the result was posted
    const postMessage = require('worker_threads').parentPort.postMessage;
    const postedMessage = postMessage.mock.calls[0][0];
    expect(postedMessage.status).toBe(200);
  });
}); 