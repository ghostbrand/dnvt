#!/bin/bash
# Vercel build script for frontend

# Install dependencies
npm install

# Build the project
npm run build

# Move build files to the correct location for Vercel
mkdir -p .vercel/output/static
cp -r build/* .vercel/output/static/
