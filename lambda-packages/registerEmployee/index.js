/**
 * AWS Lambda Function: EmployeeHub-RegisterEmployee
 * Self-contained handler for saving employee data directly into DynamoDB.
 * Works out-of-the-box in Node.js 18.x and 20.x on AWS Lambda (AWS SDK v3 is built-in).
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.TABLE_NAME || 'Employees';
const FALLBACK_TABLE = 'EmployeeHub-Employees';

const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

const ALLOWED_DEPARTMENTS = [
  'IT',
  'Engineering',
  'Product & Design',
  'Human Resources',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
  'Other'
];

const ALLOWED_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Intern', ''];

function validateInput(input = {}) {
  const errors = {};

  const employeeId = String(input.employeeId || '').trim();
  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();
  const department = String(input.department || '').trim();
  const jobRole = String(input.jobRole || '').trim();
  const dateOfJoining = String(input.dateOfJoining || '').trim();
  const employmentType = String(input.employmentType || '').trim();
  const workLocation = String(input.workLocation || '').trim();
  const gender = String(input.gender || '').trim();
  const workMode = String(input.workMode || '').trim();

  if (!employeeId) {
    errors.employeeId = 'Employee ID is required';
  } else if (!/^[A-Za-z0-9\-]{2,20}$/.test(employeeId)) {
    errors.employeeId = 'Employee ID must be 2–20 alphanumeric characters or hyphens';
  }

  if (!fullName || fullName.length < 2 || fullName.length > 80) {
    errors.fullName = 'Full name must be between 2 and 80 characters';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please provide a valid email address';
  }

  if (!department) {
    errors.department = 'Department is required';
  }

  if (!jobRole || jobRole.length < 2 || jobRole.length > 80) {
    errors.jobRole = 'Job role is required (2-80 characters)';
  }

  if (!dateOfJoining) {
    errors.dateOfJoining = 'Date of joining is required';
  }

  const dob = String(input.dob || '').trim();
  const address = String(input.address || '').trim();
  const emergencyName = String(input.emergencyName || '').trim();
  const emergencyPhone = String(input.emergencyPhone || '').trim();
  const salary = String(input.salary || '').trim();
  const bankAccount = String(input.bankAccount || '').trim();
  const taxId = String(input.taxId || '').trim();
  const allowances = Array.isArray(input.allowances) ? input.allowances : [];
  const benefits = Array.isArray(input.benefits) ? input.benefits : [];

  const sanitized = isValid
    ? {
        employeeId,
        fullName,
        email,
        phone,
        department,
        jobRole,
        dateOfJoining,
        employmentType: employmentType || 'Full-Time',
        workLocation,
        gender: gender || 'Male',
        workMode: workMode || 'On-Site',
        dob,
        address,
        emergencyName,
        emergencyPhone,
        salary,
        bankAccount,
        taxId,
        allowances,
        benefits
      }
    : null;

  return { isValid, errors, sanitized };
}

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event));

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    const { isValid, errors, sanitized } = validateInput(body);
    if (!isValid) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Validation failed', errors })
      };
    }

    const now = new Date().toISOString();
    const item = {
      ...sanitized,
      createdAt: now,
      updatedAt: now
    };

    // Put item into DynamoDB with duplicate ID check (supports both Employees and EmployeeHub-Employees tables)
    try {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: 'attribute_not_exists(employeeId)'
      }));
    } catch (tblErr) {
      if (tblErr.name === 'ResourceNotFoundException' && TABLE_NAME !== FALLBACK_TABLE) {
        console.log(`Table ${TABLE_NAME} not found, trying fallback table ${FALLBACK_TABLE}`);
        await docClient.send(new PutCommand({
          TableName: FALLBACK_TABLE,
          Item: item,
          ConditionExpression: 'attribute_not_exists(employeeId)'
        }));
      } else {
        throw tblErr;
      }
    }

    return {
      statusCode: 201,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: 'Employee registered successfully',
        data: item
      })
    };
  } catch (err) {
    console.error('DynamoDB Put Error:', err);

    if (err.name === 'ConditionalCheckFailedException') {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: false,
          message: 'An employee with this Employee ID already exists',
          code: 'EMPLOYEE_ALREADY_EXISTS'
        })
      };
    }

    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'Internal error while saving employee to DynamoDB: ' + (err.message || err.name)
      })
    };
  }
};
