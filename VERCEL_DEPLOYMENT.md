# Vercel Deployment Guide

This guide explains how to deploy the pharmacy backend to Vercel.

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. GitHub/GitLab/Bitbucket repository with your code
3. All environment variables ready

## Deployment Steps

### 1. Prepare Environment Variables

Before deploying, make sure you have all these environment variables set in Vercel:

**Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
- `JWT_SECRET` - Secret key for JWT token signing
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., "7d")

**Azure OpenAI (for PDF processing):**
- `AZURE_OPENAI_API_KEY` - Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT` - Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT` - Deployment name
- `AZURE_OPENAI_API_VERSION` - API version (default: "2025-01-01-preview")

**Optional:**
- `FRONTEND_URL` - Your frontend URL for CORS
- `PORT` - Port number (Vercel sets this automatically)
- `NODE_ENV` - Set to "production" in Vercel

### 2. Deploy via Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository
4. Configure the project:
   - **Framework Preset:** Other
   - **Root Directory:** `./` (or leave default)
   - **Build Command:** `npm run build`
   - **Output Directory:** Leave empty (not needed for serverless)
   - **Install Command:** `npm install` (or `yarn install` if using yarn)

5. Add all environment variables in the "Environment Variables" section

6. Click "Deploy"

### 3. Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# For production deployment
vercel --prod
```

### 4. Set Environment Variables via CLI

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add JWT_SECRET
# ... add all other variables
```

## Project Structure

The deployment uses:
- `api/index.ts` - Vercel serverless function entry point
- `src/server.ts` - Express app (exported for Vercel)
- `vercel.json` - Vercel configuration

## Important Notes

1. **File Uploads**: File uploads work via Supabase Storage, so no local file system is needed
2. **Environment Variables**: Vercel automatically provides env vars, no `.env.local` needed in production
3. **CORS**: Make sure to add your frontend URL to `FRONTEND_URL` env var
4. **Function Timeout**: Set to 60 seconds (can be increased in Vercel dashboard for Pro plan)
5. **Cold Starts**: First request may be slower due to serverless cold starts

## Testing Deployment

After deployment, test these endpoints:
- `https://your-project.vercel.app/health` - Health check
- `https://your-project.vercel.app/api-docs` - Swagger documentation
- `https://your-project.vercel.app/api/auth/signin` - API endpoints

## Troubleshooting

### Build Fails
- Check that all TypeScript files compile: `npm run build`
- Ensure all dependencies are in `package.json`

### Environment Variables Not Working
- Verify all env vars are set in Vercel dashboard
- Redeploy after adding new env vars

### CORS Errors
- Add your frontend URL to `FRONTEND_URL` env var
- Check CORS configuration in `src/server.ts`

### Function Timeout
- Increase timeout in Vercel dashboard (Pro plan required for >60s)
- Optimize slow endpoints

## Local Development

The app still works locally:
```bash
npm run dev
```

It will use `.env.local` for environment variables when running locally.

## Continuous Deployment

Vercel automatically deploys on every push to your main branch. For other branches, it creates preview deployments.

