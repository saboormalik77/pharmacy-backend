import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
// Vercel provides env vars directly, so only load .env.local in development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  dotenv.config({ path: '.env.local' });
}

const apiKey = process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || process.env.OPENAI_MODEL;
const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview';

if (!apiKey || !endpoint || !deployment) {
  throw new Error('Missing Azure OpenAI configuration. Please check your .env.local file.');
}

// Initialize OpenAI client for Azure OpenAI
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: `${endpoint}/openai/deployments/${deployment}`,
  defaultQuery: { 'api-version': apiVersion },
  defaultHeaders: {
    'api-key': apiKey,
  },
} as any); // Type assertion needed for Azure OpenAI compatibility

export { client, deployment, apiVersion };

