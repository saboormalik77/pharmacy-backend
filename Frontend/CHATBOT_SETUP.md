# Chatbot Setup Guide

This application includes an AI-powered chatbot that uses Azure OpenAI to help users navigate the pharmacy management system.

## Features

- **Intelligent Assistance**: Answers questions about inventory, returns, shipments, warehouse operations, payments, and more
- **Contextual Links**: Provides relevant links to pages based on user queries
- **Smart Suggestions**: Offers helpful suggestions for follow-up questions
- **Knowledge Base**: Contains comprehensive information about all system features

## Setup Instructions

### 1. Azure OpenAI Configuration

You need to set up an Azure OpenAI resource and configure the following environment variables:

#### Get Azure OpenAI Credentials:

1. Go to [Azure Portal](https://portal.azure.com)
2. Create or navigate to your Azure OpenAI resource
3. Go to "Keys and Endpoint" section
4. Copy your endpoint URL and API key

#### Environment Variables:

Create a `.env.local` file in the root directory with:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

**Note**: You can also use `gpt-35-turbo` for faster and more cost-effective responses:
```env
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-35-turbo
```

### 2. Deployment Name

Make sure you have deployed a model in your Azure OpenAI resource:
- Go to your Azure OpenAI resource
- Navigate to "Model deployments"
- Create a deployment (e.g., `gpt-4` or `gpt-35-turbo`)
- Use the deployment name in `AZURE_OPENAI_DEPLOYMENT_NAME`

### 3. Fallback Mode

If Azure OpenAI is not configured, the chatbot will use a fallback mode that:
- Still provides helpful responses based on the knowledge base
- Shows relevant links and suggestions
- Works without AI capabilities

## Usage

1. **Access the Chatbot**: Click the floating chat button in the bottom-right corner of any page
2. **Ask Questions**: Type your question about any feature of the system
3. **Follow Links**: Click on suggested links to navigate to relevant pages
4. **Use Suggestions**: Click on suggestion buttons to ask follow-up questions

## Knowledge Base

The chatbot has knowledge about:
- Inventory Management
- Returns Management
- Shipments
- Warehouse Operations
- Payments & Credits
- Marketplace
- Analytics
- Expired Medication Handling
- NDC Lookup

## Customization

### Adding Knowledge

Edit `/data/chatbotKnowledge.ts` to add new knowledge items:

```typescript
{
  keywords: ['your', 'keywords'],
  content: 'Your helpful content here',
  links: [
    { title: 'Link Title', url: '/path' }
  ],
  suggestions: ['Suggestion 1', 'Suggestion 2']
}
```

### Styling

The chatbot uses the same color scheme as the rest of the application (teal/cyan). You can customize it in `/components/chatbot/Chatbot.tsx`.

## Troubleshooting

### Chatbot not responding
- Check that Azure OpenAI environment variables are set correctly
- Verify your API key is valid
- Check browser console for errors
- Ensure your Azure OpenAI resource has available quota

### Fallback mode issues
- The fallback mode should work even without Azure OpenAI
- Check that the knowledge base file is accessible
- Verify API route is working: `/api/chatbot`

## Security Notes

- Never commit `.env.local` to version control
- API keys should be kept secure
- Consider using Azure Key Vault for production deployments
- Implement rate limiting for production use

