# Validation Middleware Documentation

This documentation explains how to use the detailed validation error response middleware for the rubylith-components project.

## Overview

The validation middleware provides detailed error responses when request validation fails, significantly improving the developer experience by providing specific information about what went wrong.

## Error Response Format

When validation fails, the API returns a 400 Bad Request with detailed error information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "contractId",
        "message": "contractId is required",
        "value": null
      },
      {
        "field": "name",
        "message": "name must be at least 3 characters long",
        "value": "ab"
      }
    ]
  }
}
```

## Usage

### Basic Usage

```typescript
import express from 'express';
import { validate, validationErrorHandler } from './src';

const app = express();
app.use(express.json());

// Define validation schema
const contractSchema = {
  body: [
    { field: 'contractId', required: true, type: 'string', minLength: 1 },
    { field: 'name', required: true, type: 'string', minLength: 3, maxLength: 100 },
    { field: 'version', required: false, type: 'string', pattern: /^\d+\.\d+\.\d+$/ }
  ]
};

// Apply validation middleware
app.post('/api/contracts', validate(contractSchema), (req, res) => {
  // Request is guaranteed to be valid here
  res.json({ message: 'Contract created', data: req.body });
});

// Apply error handler
app.use(validationErrorHandler);
```

### Validation Rules

#### Required Fields
```typescript
{ field: 'contractId', required: true }
```

#### Type Validation
```typescript
{ field: 'age', type: 'number' }
{ field: 'active', type: 'boolean' }
{ field: 'tags', type: 'array' }
{ field: 'metadata', type: 'object' }
```

#### String Length Validation
```typescript
{ field: 'username', type: 'string', minLength: 3, maxLength: 20 }
```

#### Pattern Validation
```typescript
{ field: 'email', type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
{ field: 'version', type: 'string', pattern: /^\d+\.\d+\.\d+$/ }
```

#### Custom Validation
```typescript
{
  field: 'age',
  type: 'number',
  validator: (value) => value >= 18 || 'Must be 18 or older'
}
```

### Pre-defined Schemas

The middleware includes common validation schemas:

```typescript
import { commonSchemas } from './src';

// Contract validation
app.post('/api/contracts', validate(commonSchemas.contractValidation), handler);

// Component validation  
app.post('/api/components', validate(commonSchemas.componentValidation), handler);
```

### Validating Different Request Parts

```typescript
const schema = {
  body: [
    { field: 'name', required: true, type: 'string' }
  ],
  query: [
    { field: 'page', required: false, type: 'number' }
  ],
  params: [
    { field: 'id', required: true, type: 'string', minLength: 1 }
  ]
};

app.put('/api/users/:id', validate(schema), handler);
```

## Error Handling

The middleware automatically formats validation errors, but you can also handle `ValidationException` manually:

```typescript
import { ValidationException, formatValidationError } from './src';

app.use((error, req, res, next) => {
  if (error instanceof ValidationException) {
    return res.status(400).json({
      error: formatValidationError(error)
    });
  }
  next(error);
});
```

## Testing

The validation middleware includes comprehensive tests demonstrating all validation scenarios:

```bash
npm test
```

## Benefits

1. **Detailed Error Messages**: Specific field-level validation errors
2. **Consistent Format**: Standardized error response structure across all endpoints  
3. **Developer Experience**: Clear, actionable error messages for debugging
4. **Type Safety**: Full TypeScript support with proper type definitions
5. **Flexible Validation**: Support for custom validators and complex validation rules

## Example Error Responses

### Missing Required Fields
```json
{
  "error": {
    "code": "VALIDATION_ERROR", 
    "message": "Request validation failed",
    "details": [
      {
        "field": "contractId",
        "message": "contractId is required"
      }
    ]
  }
}
```

### Invalid Field Types
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed", 
    "details": [
      {
        "field": "age",
        "message": "age must be of type number",
        "value": "twenty-five"
      }
    ]
  }
}
```

### Custom Validation Failures
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "age", 
        "message": "Must be 18 or older",
        "value": 16
      }
    ]
  }
}
```