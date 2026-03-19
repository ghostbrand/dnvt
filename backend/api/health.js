// Simple health check endpoint
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'DNVT API is running on Vercel',
    version: '1.0.0'
  });
};
