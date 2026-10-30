/**
 * Lambda Handler: GET /employees/{id}
 * Retrieves single employee details by ID
 */

const { getEmployeeById } = require('../services/employeeService');
const { success, error } = require('../utils/response');

exports.handler = async (event) => {
  console.log('Received getEmployee event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return success(200, {});
  }

  try {
    const employeeId = event.pathParameters && event.pathParameters.id;

    if (!employeeId) {
      return error(400, 'Employee ID is required in URL path', 'MISSING_ID');
    }

    const employee = await getEmployeeById(decodeURIComponent(employeeId));

    if (!employee) {
      return error(404, `Employee with ID '${employeeId}' was not found`, 'NOT_FOUND');
    }

    return success(200, employee);
  } catch (err) {
    console.error('Error fetching employee by ID:', err);
    return error(500, 'Internal Server Error while retrieving employee record', 'INTERNAL_ERROR');
  }
};
