/**
 * Backend Employee Input Validation & Sanitization
 */

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

function validateEmployeeInput(input = {}) {
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

  // employeeId: 2-20 chars alphanumeric + hyphen
  if (!employeeId) {
    errors.employeeId = 'Employee ID is required';
  } else if (!/^[A-Za-z0-9\-]{2,20}$/.test(employeeId)) {
    errors.employeeId = 'Employee ID must be 2–20 alphanumeric characters or hyphens';
  }

  // fullName: 2-80 chars
  if (!fullName) {
    errors.fullName = 'Full name is required';
  } else if (fullName.length < 2 || fullName.length > 80) {
    errors.fullName = 'Full name must be between 2 and 80 characters';
  }

  // email: standard RFC 5322 regex
  if (!email) {
    errors.email = 'Email address is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    errors.email = 'Please provide a valid email address';
  }

  // phone: optional, 7-15 digits
  if (phone && !/^[\d\s\-+()]{7,15}$/.test(phone)) {
    errors.phone = 'Phone number format is invalid';
  }

  // department
  if (!department) {
    errors.department = 'Department is required';
  } else if (!ALLOWED_DEPARTMENTS.includes(department)) {
    errors.department = `Department must be one of: ${ALLOWED_DEPARTMENTS.join(', ')}`;
  }

  // jobRole
  if (!jobRole) {
    errors.jobRole = 'Job role is required';
  } else if (jobRole.length < 2 || jobRole.length > 80) {
    errors.jobRole = 'Job role must be between 2 and 80 characters';
  }

  // dateOfJoining
  if (!dateOfJoining) {
    errors.dateOfJoining = 'Date of joining is required';
  } else {
    const parsedDate = new Date(dateOfJoining);
    if (isNaN(parsedDate.getTime())) {
      errors.dateOfJoining = 'Invalid date format (use YYYY-MM-DD)';
    } else if (parsedDate > new Date()) {
      errors.dateOfJoining = 'Date of joining cannot be in the future';
    }
  }

  // employmentType
  if (employmentType && !ALLOWED_TYPES.includes(employmentType)) {
    errors.employmentType = `Employment type must be one of: ${ALLOWED_TYPES.filter(Boolean).join(', ')}`;
  }

  // workLocation
  if (workLocation && workLocation.length > 80) {
    errors.workLocation = 'Work location cannot exceed 80 characters';
  }

  const isValid = Object.keys(errors).length === 0;

  const gender = String(input.gender || '').trim();
  const workMode = String(input.workMode || '').trim();
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

module.exports = {
  validateEmployeeInput,
  ALLOWED_DEPARTMENTS,
  ALLOWED_TYPES
};
