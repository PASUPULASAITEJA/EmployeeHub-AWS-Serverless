/**
 * Standard API Gateway Response Formatter
 * Handles CORS headers, standardized JSON payloads, and error codes
 */

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};

function success(statusCode, data, message = null) {
  const body = {
    success: true,
    data
  };
  if (message) body.message = message;

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

function error(statusCode, message, code = 'ERROR', details = null) {
  const body = {
    success: false,
    message,
    code
  };
  if (details) body.details = details;

  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body)
  };
}

module.exports = {
  CORS_HEADERS,
  success,
  error
};
