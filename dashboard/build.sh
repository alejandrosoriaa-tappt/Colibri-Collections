#!/bin/sh
echo "VITE_SUPABASE_URL=$VITE_SUPABASE_URL" > .env.production.local
echo "VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY" >> .env.production.local
echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> .env.production.local
npm run build
