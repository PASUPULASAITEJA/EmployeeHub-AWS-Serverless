/**
 * Local Development Server for EmployeeHub
 * Simulates AWS API Gateway & Lambda handlers locally on port 3001
 * Serves the frontend application at http://localhost:3001
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const registerHandler = require('./src/handlers/registerEmployee').handler;
const listHandler = require('./src/handlers/listEmployees').handler;
const getHandler = require('./src/handlers/getEmployee').handler;

const PORT = process.env.PORT || 3001;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');
const FRONTEND_INDEX = path.join(FRONTEND_DIR, 'index.html');

// In-memory fallback if local DynamoDB is not running
const memoryStore = new Map();

// Helper to convert HTTP request to API Gateway event
async function parseEvent(req, parsedUrl) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const isItem = pathParts.length >= 2 && pathParts[0] === 'employees';

      resolve({
        httpMethod: req.method,
        path: parsedUrl.pathname,
        queryStringParameters: parsedUrl.query || {},
        headers: req.headers,
        pathParameters: isItem ? { id: decodeURIComponent(pathParts[1]) } : null,
        body: body || null
      });
    });
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return res.end();
  }

  // API Routes (/employees and /employees/{id})
  if (pathname === '/employees' || pathname.startsWith('/employees/')) {
    const event = await parseEvent(req, parsedUrl);
    let result;

    try {
      if (req.method === 'POST' && pathname === '/employees') {
        // Try real lambda handler first (DynamoDB)
        try {
          result = await registerHandler(event);
        } catch {
          // In-memory fallback for immediate zero-config demo
          const { validateEmployeeInput } = require('./src/utils/validation');
          const body = JSON.parse(event.body || '{}');
          const { isValid, errors, sanitized } = validateEmployeeInput(body);
          if (!isValid) {
            result = { statusCode: 400, body: JSON.stringify({ success: false, message: 'Validation failed', errors }) };
          } else if (memoryStore.has(sanitized.employeeId)) {
            result = { statusCode: 409, body: JSON.stringify({ success: false, message: 'An employee with this ID already exists', code: 'EMPLOYEE_ALREADY_EXISTS' }) };
          } else {
            const now = new Date().toISOString();
            const record = { ...sanitized, createdAt: now, updatedAt: now };
            memoryStore.set(record.employeeId, record);
            result = { statusCode: 201, body: JSON.stringify({ success: true, message: 'Employee registered successfully', data: record }) };
          }
        }
      } else if (req.method === 'GET' && pathname === '/employees') {
        try {
          result = await listHandler(event);
        } catch {
          const items = Array.from(memoryStore.values());
          result = { statusCode: 200, body: JSON.stringify({ success: true, data: { items, count: items.length } }) };
        }
      } else if (req.method === 'GET' && pathname.startsWith('/employees/')) {
        try {
          result = await getHandler(event);
        } catch {
          const id = decodeURIComponent(pathname.replace('/employees/', ''));
          const item = memoryStore.get(id);
          if (item) {
            result = { statusCode: 200, body: JSON.stringify({ success: true, data: item }) };
          } else {
            result = { statusCode: 404, body: JSON.stringify({ success: false, message: 'Employee not found' }) };
          }
        }
      } else if (req.method === 'PUT' && pathname.startsWith('/employees/')) {
        const id = decodeURIComponent(pathname.replace('/employees/', ''));
        const body = JSON.parse(event.body || '{}');
        const existing = memoryStore.get(id);
        if (existing) {
          const updated = {
            ...existing,
            fullName: body.fullName || existing.fullName,
            email: body.email || existing.email,
            phone: body.phone !== undefined ? body.phone : existing.phone,
            department: body.department || existing.department,
            jobRole: body.jobRole || existing.jobRole,
            dateOfJoining: body.dateOfJoining || existing.dateOfJoining,
            employmentType: body.employmentType !== undefined ? body.employmentType : existing.employmentType,
            workLocation: body.workLocation !== undefined ? body.workLocation : existing.workLocation,
            updatedAt: new Date().toISOString()
          };
          memoryStore.set(id, updated);
          result = { statusCode: 200, body: JSON.stringify({ success: true, message: 'Employee updated successfully', data: updated }) };
        } else {
          result = { statusCode: 404, body: JSON.stringify({ success: false, message: 'Employee not found' }) };
        }
      } else if (req.method === 'DELETE' && pathname.startsWith('/employees/')) {
        const id = decodeURIComponent(pathname.replace('/employees/', ''));
        if (memoryStore.has(id)) {
          memoryStore.delete(id);
          result = { statusCode: 200, body: JSON.stringify({ success: true, message: 'Employee deleted successfully' }) };
        } else {
          result = { statusCode: 404, body: JSON.stringify({ success: false, message: 'Employee not found' }) };
        }
      } else {
        result = { statusCode: 405, body: JSON.stringify({ success: false, message: 'Method Not Allowed' }) };
      }
    } catch (e) {
      result = { statusCode: 500, body: JSON.stringify({ success: false, message: e.message }) };
    }

    const headers = result.headers || { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
    res.writeHead(result.statusCode || 200, headers);
    return res.end(result.body);
  }

  // Serve Frontend Single-File Application
  let filePath = path.join(FRONTEND_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!fs.existsSync(filePath)) {
    filePath = FRONTEND_INDEX;
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json'
    };
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    return fs.createReadStream(filePath).pipe(res);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` EmployeeHub Local Server running at: http://localhost:${PORT}`);
  console.log(` - Frontend: http://localhost:${PORT}`);
  console.log(` - API:      http://localhost:${PORT}/employees`);
  console.log(`====================================================`);
});
