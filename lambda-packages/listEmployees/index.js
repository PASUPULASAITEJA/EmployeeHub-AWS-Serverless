/**
 * AWS Lambda Function: EmployeeHub-ListEmployees
 * Self-contained handler for retrieving employee records from DynamoDB.
 * Supports both 'Employees' and 'EmployeeHub-Employees' tables.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

exports.handler = async (event) => {
  console.log('Received list event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 100;

    let scanParams = {
      TableName: TABLE_NAME,
      Limit: limit
    };

    let result;
    try {
      result = await docClient.send(new ScanCommand(scanParams));
    } catch (tblErr) {
      if (tblErr.name === 'ResourceNotFoundException' && TABLE_NAME !== FALLBACK_TABLE) {
        console.log(`Table ${TABLE_NAME} not found, scanning fallback table ${FALLBACK_TABLE}`);
        scanParams.TableName = FALLBACK_TABLE;
        result = await docClient.send(new ScanCommand(scanParams));
      } else {
        throw tblErr;
      }
    }

    const items = result.Items || [];

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: {
          items,
          count: items.length
        }
      })
    };
  } catch (err) {
    console.error('DynamoDB Scan Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        message: 'Internal error while retrieving employees: ' + (err.message || err.name)
      })
    };
  }
};
