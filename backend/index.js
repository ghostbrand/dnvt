// DNVT Backend API - Vercel Serverless Function
// NO DEPENDENCIES - Pure Node.js

module.exports = (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const url = req.url || '/';
  const method = req.method;

  // Health endpoint
  if (url.includes('health')) {
    res.status(200).json({
      status: 'ok',
      message: 'DNVT API is running',
      timestamp: new Date().toISOString(),
      environment: 'vercel-serverless'
    });
    return;
  }

  // Root endpoint
  res.status(200).json({
    message: 'DNVT Backend API',
    version: '1.0.0',
    url: url,
    method: method,
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      root: '/'
    }
  });
};
