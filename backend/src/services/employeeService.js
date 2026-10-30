/**
 * DynamoDB Service Layer for EmployeeHub
 * Supports AWS SDK v3 with conditional uniqueness checking and error handling.
 * Gracefully provides local simulation if @aws-sdk is not installed locally.
 */

const TABLE_NAME = process.env.TABLE_NAME || 'Employees';
const FALLBACK_TABLE = 'EmployeeHub-Employees';

let docClient = null;
let useRealDdb = false;

try {
  const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
  const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

  const clientConfig = {
    region: process.env.AWS_REGION || 'us-east-1'
  };

  if (process.env.DYNAMODB_ENDPOINT) {
    clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  }

  const ddbClient = new DynamoDBClient(clientConfig);
  docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      removeUndefinedValues: true
    }
  });
  useRealDdb = true;
} catch (e) {
  // Running locally without AWS SDK installed
  useRealDdb = false;
}

// Local in-memory fallback store
const localStore = new Map();

/**
 * Creates an employee record with conditional check on employeeId uniqueness
 */
async function createEmployee(employeeData) {
  const timestamp = new Date().toISOString();
  const item = {
    ...employeeData,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  if (useRealDdb && docClient) {
    const { PutCommand } = require('@aws-sdk/lib-dynamodb');
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(employeeId)'
    });
    await docClient.send(command);
    return item;
  }

  // Local fallback
  if (localStore.has(item.employeeId)) {
    const err = new Error('Conditional check failed: employeeId exists');
    err.name = 'ConditionalCheckFailedException';
    throw err;
  }
  localStore.set(item.employeeId, item);
  return item;
}

/**
 * Retrieves an employee by partition key (employeeId)
 */
async function getEmployeeById(employeeId) {
  if (useRealDdb && docClient) {
    const { GetCommand } = require('@aws-sdk/lib-dynamodb');
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { employeeId }
    });
    const response = await docClient.send(command);
    return response.Item || null;
  }

  return localStore.get(employeeId) || null;
}

/**
 * Lists employees (supports scan with limit and pagination)
 */
async function listAllEmployees(options = {}) {
  const { limit = 100, lastEvaluatedKey } = options;

  if (useRealDdb && docClient) {
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const command = new ScanCommand({
      TableName: TABLE_NAME,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey
    });
    const response = await docClient.send(command);
    return {
      items: response.Items || [],
      count: response.Count || 0,
      lastEvaluatedKey: response.LastEvaluatedKey || null
    };
  }

  const items = Array.from(localStore.values()).slice(0, limit);
  return {
    items,
    count: items.length,
    lastEvaluatedKey: null
  };
}

module.exports = {
  createEmployee,
  getEmployeeById,
  listAllEmployees,
  TABLE_NAME,
  docClient,
  useRealDdb
};
