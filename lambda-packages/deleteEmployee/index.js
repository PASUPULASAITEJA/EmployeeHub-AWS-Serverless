/**
 * AWS Lambda Function: EmployeeHub-DeleteEmployee
 * Deletes an employee record from DynamoDB by employeeId
 * Supports both 'Employees' and 'EmployeeHub-Employees' tables.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

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
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Received delete event:', JSON.stringify(event));

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const employeeId = event.pathParameters?.id || event.pathParameters?.employeeId;

    if (!employeeId) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, message: 'Employee ID is required in URL path' })
      };
    }

    const deleteParams = {
      TableName: TABLE_NAME,
      Key: { employeeId: decodeURIComponent(employeeId) }
    };

    try {
      await docClient.send(new DeleteCommand(deleteParams));
    } catch (tblErr) {
      if (tblErr.name === 'ResourceNotFoundException' && TABLE_NAME !== FALLBACK_TABLE) {
        console.log(`Table ${TABLE_NAME} not found, deleting from fallback table ${FALLBACK_TABLE}`);
        deleteParams.TableName = FALLBACK_TABLE;
        await docClient.send(new DeleteCommand(deleteParams));
      } else {
        throw tblErr;
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        message: `Employee ${employeeId} deleted successfully`
      })
    };
  } catch (err) {
    console.error('DynamoDB Delete Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'Internal error while deleting employee: ' + (err.message || err.name)
      })
    };
  }
};
