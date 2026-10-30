/**
 * Lambda Handler: GET /employees
 * Lists employees from DynamoDB
 */

const { listAllEmployees } = require('../services/employeeService');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  console.log('Received listEmployees event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return success(200, {});
  }

  try {
    const queryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 100;

    let lastEvaluatedKey = null;
    if (queryParams.nextToken) {
      try {
        lastEvaluatedKey = JSON.parse(Buffer.from(queryParams.nextToken, 'base64').toString('utf8'));
      } catch {
        // Ignore invalid token format and scan from beginning
      }
    }

    const result = await listAllEmployees({ limit, lastEvaluatedKey });

    const nextToken = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return success(200, {
      items: result.items,
      count: result.count,
      nextToken
    });
  } catch (err) {
    console.error('Error listing employees:', err);
    return error(500, 'Internal Server Error while retrieving employees', 'INTERNAL_ERROR');
  }
};
