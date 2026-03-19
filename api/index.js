// Vercel serverless function wrapper for backend
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Import the Express app
const { app } = require('../backend/server');

// Export for Vercel serverless
module.exports = app;
