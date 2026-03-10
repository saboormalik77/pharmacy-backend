# Chatbot Credentials Setup Guide

## 🔐 Security Notice

**IMPORTANT**: All chatbot credentials are stored server-side only and are NEVER exposed to the client/UI. The API route runs on the server, and environment variables are only accessible in server-side code.

## 📍 Where to Add Credentials

### Step 1: Create Environment File

Create a file named `.env.local` in the **root directory** of your project (same level as `package.json`):

```
/home/asim/truemedit/phramcy/.env.local
```

### Step 2: Add Your Credentials

Copy the contents from `env.example` and fill in your actual Azure OpenAI credentials:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-actual-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

### Step 3: Get Your Credentials

1. **Go to Azure Portal**: https://portal.azure.com
2. **Navigate to your Azure OpenAI resource**
3. **Get Endpoint**:
   - Go to "Keys and Endpoint" section
   - Copy the "Endpoint" URL (should look like: `https://your-resource.openai.azure.com/`)
4. **Get API Key**:
   - In the same "Keys and Endpoint" section
   - Copy either "Key 1" or "Key 2"
5. **Get Deployment Name**:
   - Go to "Model deployments" section
   - Create a deployment if you haven't already (e.g., `gpt-4` or `gpt-35-turbo`)
   - Use the deployment name you created

### Step 4: Verify Setup

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Test the chatbot - it should work with Azure OpenAI if credentials are correct, or use fallback mode if not configured.

## 🔒 Security Features

### ✅ What's Protected:

1. **Environment Variables**: 
   - Stored in `.env.local` (already in `.gitignore`)
   - Only accessible in server-side code (API routes)
   - Never sent to the browser/client

2. **API Route Security**:
   - All Azure OpenAI calls happen server-side in `/app/api/chatbot/route.ts`
   - API keys are only used in server-side fetch requests
   - No credentials are exposed in client-side code

3. **Git Protection**:
   - `.env.local` is in `.gitignore` (already configured)
   - `env.example` is safe to commit (contains no real credentials)

### ❌ What's NOT Exposed:

- ✅ API keys are NOT in client-side JavaScript
- ✅ API keys are NOT in browser network requests (only server-to-server)
- ✅ API keys are NOT in environment variables accessible to client
- ✅ API keys are NOT in source code

## 🚀 Deployment

### For Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT_NAME`

### For Other Platforms:

Add the environment variables in your platform's configuration:
- Railway: Project Settings → Variables
- Heroku: Settings → Config Vars
- AWS: Environment Variables in your deployment config

## 🧪 Testing

1. **Without Azure OpenAI** (Fallback Mode):
   - The chatbot will still work using the knowledge base
   - Responses will be based on keyword matching
   - Links and suggestions will still be provided

2. **With Azure OpenAI**:
   - More intelligent, contextual responses
   - Better understanding of user intent
   - Natural language processing

## 📝 File Structure

```
phramcy/
├── .env.local              ← CREATE THIS (not in git)
├── env.example             ← Safe to commit (template)
├── app/
│   └── api/
│       └── chatbot/
│           └── route.ts    ← Server-side only (secure)
└── components/
    └── chatbot/
        └── Chatbot.tsx     ← Client component (no credentials)
```

## ⚠️ Troubleshooting

### Error: "DeploymentNotFound" or "The API deployment for this resource does not exist"

This error means the deployment name in your `.env.local` doesn't match a deployment in Azure:

1. **Check deployment name**:
   - Go to Azure Portal → Your Azure OpenAI resource
   - Navigate to "Model deployments" section
   - See the exact name of your deployment (e.g., `gpt-4`, `gpt-35-turbo`, `gpt-4-turbo`)
   - Update `AZURE_OPENAI_DEPLOYMENT_NAME` in `.env.local` to match exactly

2. **Create deployment if missing**:
   - In "Model deployments", click "Create"
   - Select a model (e.g., GPT-4 or GPT-35-Turbo)
   - Enter a deployment name (e.g., `gpt-4`)
   - Wait for deployment to complete (may take a few minutes)
   - Use this exact name in your `.env.local`

3. **Common deployment names**:
   - `gpt-4` (if you deployed GPT-4)
   - `gpt-35-turbo` (if you deployed GPT-3.5 Turbo)
   - `gpt-4-turbo` (if you deployed GPT-4 Turbo)

### Chatbot not working with Azure OpenAI:

1. **Check credentials are correct**:
   - Endpoint should end with `/` (e.g., `https://resource.openai.azure.com/`)
   - API key should be the full key from Azure Portal
   - Deployment name should match exactly (case-sensitive)

2. **Check deployment exists**:
   - Go to Azure Portal → Your resource → Model deployments
   - Ensure a deployment with the name you specified exists
   - Deployment name is case-sensitive

3. **Check quota**:
   - Ensure your Azure OpenAI resource has available quota
   - Check usage in Azure Portal

4. **Check server logs**:
   - Look for errors in terminal/console
   - Check for "Azure OpenAI not configured" warnings
   - Look for "DeploymentNotFound" errors

### Fallback mode working but Azure OpenAI not:

- The chatbot will automatically use fallback mode if Azure OpenAI fails
- Fallback mode uses the knowledge base and still provides helpful responses
- To fix Azure OpenAI:
  1. Check `.env.local` file exists and has correct values
  2. Verify deployment name matches exactly (case-sensitive)
  3. Restart development server after making changes
  4. Check Azure Portal to ensure deployment is active

## 🔍 Verification

To verify credentials are NOT exposed:

1. Open browser DevTools → Network tab
2. Send a message in the chatbot
3. Check the request to `/api/chatbot`
4. Verify: API key is NOT in the request payload or headers
5. Verify: Only your message is sent, credentials stay on server

## 📚 Additional Resources

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Azure OpenAI Setup Guide](https://learn.microsoft.com/en-us/azure/ai-services/openai/how-to/create-resource)

