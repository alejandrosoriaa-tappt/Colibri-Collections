#!/bin/sh
node -e "
const fs = require('fs');
const env = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || '',
  VITE_CRM_API_BASE_URL: process.env.VITE_CRM_API_BASE_URL || ''
};
fs.writeFileSync('dist/env.js', 'window.__env__ = ' + JSON.stringify(env) + ';');
console.log('Generated env.js with runtime config');
"
npx serve dist --single -p $PORT
