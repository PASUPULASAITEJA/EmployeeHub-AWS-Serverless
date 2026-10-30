/**
 * Lambda Handler: POST /employees
 * Registers a new employee with validation & DynamoDB conditional write
 */

const { validateEmployeeInput } = require('../utils/validation');
const { createEmployee } = require('../services/employeeService');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  console.log('Received registerEmployee event:', JSON.stringify(event));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return success(200, {});
  }

  try {
    let body;
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {});
    } catch {
      return error(400, 'Invalid JSON in request body', 'INVALID_JSON');
    }

    // Input validation
    const { isValid, errors, sanitized } = validateEmployeeInput(body);
    if (!isValid) {
      return error(400, 'Validation failed', 'VALIDATION_ERROR', errors);
    }

    // Create record in DynamoDB
    const created = await createEmployee(sanitized);

    return success(201, created, 'Employee registered successfully');
  } catch (err) {
    console.error('Error registering employee:', err);

    if (err.name === 'ConditionalCheckFailedException') {
      return error(409, 'An employee with this Employee ID already exists', 'EMPLOYEE_ALREADY_EXISTS');
    }

    return error(500, 'Internal Server Error while saving employee', 'INTERNAL_ERROR');
  }
};
