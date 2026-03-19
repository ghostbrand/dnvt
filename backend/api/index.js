module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url || '/';
  
  if (path.includes('/health')) {
    return res.status(200).json({
      status: 'ok',
      message: 'API running',
      timestamp: new Date().toISOString()
    });
  }
  
  return res.status(200).json({
    message: 'DNVT Backend API',
    version: '1.0.0',
    path: path,
    timestamp: new Date().toISOString()
  });
};
