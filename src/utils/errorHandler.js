class AppError extends Error {
    constructor(message, statusCode, errorCode = 'INTERNAL_ERROR', details = null) {
      super(message);
      this.statusCode = statusCode;
      this.errorCode = errorCode;
      this.details = details;
      this.isOperational = true;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  const errorLogger = (error) => {
    console.error("Error Log:", {
      message: error.message,
      statusCode: error.statusCode || 500,
      errorCode: error.errorCode || 'INTERNAL_ERROR',
      details: error.details || 'No additional details',
      stack: error.stack,
    });
  };
  
  const handlePrismaError = (err) => {
    // Handle Prisma client validation errors
    if (err.code === 'P2002') {
      return new AppError(
        `Unique constraint failed on the field: ${err.meta?.target}`,
        400,
        'VALIDATION_ERROR',
        { fields: err.meta?.target }
      );
    }
    
    // Handle foreign key constraint errors
    if (err.code === 'P2003') {
      return new AppError(
        `Foreign key constraint failed on the field: ${err.meta?.field_name}`,
        400,
        'VALIDATION_ERROR',
        { field: err.meta?.field_name }
      );
    }
    
    // Handle record not found errors
    if (err.code === 'P2025') {
      return new AppError(
        err.meta?.cause || 'Record not found',
        404,
        'NOT_FOUND',
        err.meta
      );
    }

    // Handle other Prisma errors
    return new AppError(
      'Database operation failed',
      500,
      'DATABASE_ERROR',
      { prismaError: err.code, message: err.message }
    );
  };
  
  const errorHandler = (err, req, res, next) => {
    errorLogger(err);
  
    let error = { ...err };
    error.message = err.message;
  
    // Check if this is a Prisma error
    if (err.name === 'PrismaClientKnownRequestError' || err.name === 'PrismaClientValidationError') {
      error = handlePrismaError(err);
    } else if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
      // Handle JSON parse errors
      error = new AppError('Invalid JSON in request body', 400, 'VALIDATION_ERROR');
    } else if (err.name === 'ValidationError') {
      // Handle validation errors (e.g., from validator libraries)
      error = new AppError(err.message, 400, 'VALIDATION_ERROR', err.errors);
    }
  
    // Handle unknown operational errors
    const statusCode = error.statusCode || err.statusCode || 500;
    const errorCode = error.errorCode || err.errorCode || 'INTERNAL_ERROR';
    const message = error.message || err.message || 'Something went wrong';
    const details = error.details || err.details || null;
  
    // Send response
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        errorCode,
        details,
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
      },
    });
  };
  
  const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
  
  module.exports = {
    AppError,
    errorLogger,
    errorHandler,
    asyncHandler,
  };
  