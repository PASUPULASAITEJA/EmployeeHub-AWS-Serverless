/**
 * Lambda Handler: DELETE /employees/{id}
 * Deletes an employee from DynamoDB
 */

const { deleteEmployeeById } = require('../services/employeeService');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  console.log('Received deleteEmployee event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return success(200, {});
  }

  try {
    const employeeId = event.pathParameters?.id || event.pathParameters?.employeeId;

    if (!employeeId) {
      return error(400, 'Employee ID is required', 'MISSING_ID');
    }

    await deleteEmployeeById(decodeURIComponent(employeeId));

    return success(200, { employeeId }, 'Employee deleted successfully');
  } catch (err) {
    console.error('Error deleting employee:', err);
    return error(500, 'Internal Server Error while deleting employee', 'INTERNAL_ERROR');
  }
};
