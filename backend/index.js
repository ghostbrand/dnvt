// DNVT Backend API - Vercel Serverless Wrapper
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Set VERCEL flag to prevent server.listen() in server.js
process.env.VERCEL = '1';

// Import the complete app with all routes from server.js
const { app } = require('./server');

// Export for Vercel serverless
module.exports = app;
