# Vercel Deployment Instructions

## Fix for "No Output Directory named 'public' found" Error

This error occurs when Vercel's project settings are misconfigured. Follow these steps:

### Option 1: Fix in Vercel Dashboard (Recommended)

1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Find the **Build & Development Settings** section
4. Under **Output Directory**, either:
   - Leave it **empty** (auto-detect), OR
   - Set it to **`.next`** (Next.js default output directory)
5. **DO NOT** set it to `public` - that's for static sites, not Next.js
6. Save and redeploy

### Option 2: Verify Framework Detection

1. In Vercel project settings → **General**
2. Under **Framework Preset**, ensure it shows **Next.js**
3. If it doesn't, select **Next.js** from the dropdown
4. Save and redeploy

### Current Configuration

- **Framework**: Next.js (auto-detected via `vercel.json`)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (Next.js default, auto-detected)
- **Install Command**: `npm install` (default)

### Important Notes

- The `public` directory is for static assets (images, fonts, etc.), NOT the build output
- Next.js build output goes to `.next` directory
- Vercel automatically handles Next.js deployments when framework is correctly detected
- No manual output directory configuration needed for standard Next.js apps

### If Error Persists

1. Check that `vercel.json` exists in your project root (it does)
2. Ensure `package.json` has the correct build script: `"build": "next build"`
3. Verify Next.js version in `package.json` (should be 13+ for App Router)
4. Try redeploying after clearing Vercel build cache

