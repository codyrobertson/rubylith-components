import express from 'express';
import { validate, commonSchemas, validationErrorHandler } from '../api/middleware/validation';

const app = express();
app.use(express.json());

// Example endpoint using contract validation
app.post('/api/contracts', validate(commonSchemas.contractValidation), (req, res) => {
  // If we reach here, validation passed
  res.json({ 
    message: 'Contract created successfully',
    contract: req.body 
  });
});

// Example endpoint using component validation
app.post('/api/components', validate(commonSchemas.componentValidation), (req, res) => {
  // If we reach here, validation passed
  res.json({ 
    message: 'Component created successfully',
    component: req.body 
  });
});

// Example endpoint with custom validation
app.post('/api/custom', validate({
  body: [
    { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    { field: 'age', required: true, type: 'number', validator: (value) => value >= 18 || 'Must be 18 or older' },
    { field: 'username', required: true, type: 'string', minLength: 3, maxLength: 20 }
  ]
}), (req, res) => {
  res.json({ 
    message: 'User data validated successfully',
    user: req.body 
  });
});

// Apply error handler
app.use(validationErrorHandler);

// General error handler
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal server error occurred'
    }
  });
});

export default app;

/*
Example error responses:

1. Missing required field:
POST /api/contracts
{}

Response (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "contractId",
        "message": "contractId is required"
      },
      {
        "field": "name", 
        "message": "name is required"
      },
      {
        "field": "components",
        "message": "components is required"
      }
    ]
  }
}

2. Invalid field types and values:
POST /api/custom
{
  "email": "not-an-email",
  "age": 16,
  "username": "ab"
}

Response (400):
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "email format is invalid",
        "value": "not-an-email"
      },
      {
        "field": "age",
        "message": "Must be 18 or older",
        "value": 16
      },
      {
        "field": "username",
        "message": "username must be at least 3 characters long",
        "value": "ab"
      }
    ]
  }
}
*/