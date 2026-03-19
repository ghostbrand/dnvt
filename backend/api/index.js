// Vercel serverless function
module.exports = (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url } = req;
    
    // Root endpoint
    if (url === '/' || url === '') {
      res.status(200).json({
        message: 'DNVT Backend API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    // Health check
    if (url === '/api/health' || url.startsWith('/api/health')) {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'API is healthy',
        environment: 'vercel'
      });
      return;
    }
    
    // Test endpoint
    if (url === '/api/test' || url.startsWith('/api/test')) {
      res.status(200).json({
        message: 'Test successful!',
        timestamp: new Date().toISOString(),
        url: url,
        method: req.method
      });
      return;
    }
    
    // 404 for other routes
    res.status(404).json({
      error: 'Not found',
      path: url,
      message: 'Endpoint does not exist'
    });
    
  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
