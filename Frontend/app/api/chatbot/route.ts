import { NextRequest, NextResponse } from 'next/server';
import { chatbotKnowledge, findRelevantKnowledge } from '@/data/chatbotKnowledge';

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are an intelligent and helpful pharmacy management assistant for a pharmaceutical returns and inventory management system called PharmReverse. 

Your role is to help users navigate the system, answer questions about features, and provide comprehensive guidance on:
- Inventory Management (adding stock, tracking expiration dates, managing expired medications, NDC lookup)
- Returns Management (creating returns, tracking return status, return eligibility)
- Shipments (tracking shipments, carrier information, delivery status)
- Warehouse Operations (receiving packages, processing orders, expired medication disposal, FDA compliance)
- Payments & Credits (viewing expected credits, payment history, commission calculations)
- Marketplace (browsing and purchasing products, supplier information)
- Analytics (viewing reports and statistics, data insights)

IMPORTANT INSTRUCTIONS:
1. Always provide actionable, specific guidance with clear next steps
2. When mentioning features or pages, reference the exact links provided in the knowledge base
3. Be proactive - suggest related features or workflows that might help the user
4. When discussing links, mention them naturally in your response (e.g., "You can view your inventory at /inventory")
5. Provide step-by-step instructions when explaining processes
6. If a user asks about something not in the knowledge base, guide them to the most relevant feature
7. Always be professional, concise, and helpful
8. If you don't know something, admit it and suggest contacting support or checking the relevant section

When providing links in your response, format them naturally. The system will automatically show clickable links based on the knowledge base.

Current date: ${new Date().toISOString().split('T')[0]}`;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(request: NextRequest) {
  let userMessage = '';
  
  try {
    const body = await request.json();
    userMessage = body.message || '';
    const conversationHistory = body.conversationHistory || [];

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Find relevant knowledge base items
    const relevantKnowledge = findRelevantKnowledge(userMessage);
    
    // Build context from knowledge base
    let knowledgeContext = '';
    const allLinks: Array<{ title: string; url: string }> = [];
    const allSuggestions: string[] = [];

    relevantKnowledge.forEach((item) => {
      knowledgeContext += `\n\nTopic: ${item.keywords.join(', ')}\n${item.content}`;
      item.links.forEach((link) => {
        if (!allLinks.find((l) => l.url === link.url)) {
          allLinks.push(link);
        }
      });
      if (item.suggestions) {
        item.suggestions.forEach((suggestion) => {
          if (!allSuggestions.includes(suggestion)) {
            allSuggestions.push(suggestion);
          }
        });
      }
    });

    // Build enhanced context with available links
    let linksContext = '';
    if (allLinks.length > 0) {
      linksContext = '\n\nAvailable Links for this topic:\n';
      allLinks.forEach((link, idx) => {
        linksContext += `${idx + 1}. ${link.title} - ${link.url}\n`;
      });
      linksContext += '\nWhen mentioning these pages, reference them naturally in your response.';
    }

    // Build messages for Azure OpenAI
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\nRelevant Information:${knowledgeContext}${linksContext}\n\nRemember: Reference links naturally in your responses. The system will show clickable links automatically.`,
      },
      ...conversationHistory,
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Get Azure OpenAI configuration from environment variables
    const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
    const azureDeployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4';

    if (!azureEndpoint || !azureApiKey) {
      // Fallback to simple response if Azure OpenAI is not configured
      console.warn('Azure OpenAI not configured, using fallback response');
      
      let response = 'I can help you with various aspects of the pharmacy management system. ';
      
      if (relevantKnowledge.length > 0) {
        response += relevantKnowledge[0].content;
      } else {
        response += 'Please ask me about inventory management, returns, shipments, warehouse operations, payments, or any other feature.';
      }

      return NextResponse.json({
        message: response,
        links: allLinks.slice(0, 5),
        suggestions: allSuggestions.slice(0, 4),
      });
    }

    // Call Azure OpenAI
    const apiUrl = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=2024-02-15-preview`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': azureApiKey,
        },
        body: JSON.stringify({
          messages: messages,
          temperature: 0.7,
          max_tokens: 800,
          top_p: 0.95,
          frequency_penalty: 0.3,
          presence_penalty: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        
        console.error('Azure OpenAI API error:', errorData);
        
        // Handle specific error cases
        if (response.status === 404) {
          const errorMsg = errorData.error?.message || 'Deployment not found';
          if (errorMsg.includes('DeploymentNotFound') || errorMsg.includes('deployment')) {
            console.warn(`Deployment "${azureDeployment}" not found. Falling back to knowledge base.`);
            // Fall through to fallback response
            throw new Error('DEPLOYMENT_NOT_FOUND');
          }
        }
        
        // For other errors, throw to trigger fallback
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';

      return NextResponse.json({
        message: assistantMessage,
        links: allLinks.slice(0, 5),
        suggestions: allSuggestions.slice(0, 4),
      });
    } catch (fetchError: any) {
      // If it's a deployment not found error, use enhanced fallback
      if (fetchError.message === 'DEPLOYMENT_NOT_FOUND') {
        throw fetchError;
      }
      // Re-throw other errors
      throw fetchError;
    }

  } catch (error: any) {
    console.error('Chatbot API error:', error);
    
    // Enhanced fallback response
    const relevantKnowledge = findRelevantKnowledge(userMessage);
    
    // Build a helpful response based on knowledge base
    let fallbackMessage = '';
    
    if (relevantKnowledge.length > 0) {
      // Use the most relevant knowledge item
      const primaryKnowledge = relevantKnowledge[0];
      fallbackMessage = primaryKnowledge.content;
      
      // Add helpful context
      if (relevantKnowledge.length > 1) {
        fallbackMessage += `\n\nYou might also be interested in: ${relevantKnowledge.slice(1).map(k => k.keywords[0]).join(', ')}.`;
      }
    } else {
      // Generic helpful response
      fallbackMessage = `I can help you with various aspects of the pharmacy management system including:
- Inventory Management (adding stock, tracking expiration dates)
- Returns Management (creating and tracking returns)
- Shipments (tracking delivery status)
- Warehouse Operations (receiving packages, expired medication disposal)
- Payments & Credits (viewing expected credits and payment history)
- Marketplace (browsing and purchasing products)
- Analytics (viewing reports and statistics)

What would you like to know more about?`;
    }

    // Return successful response with fallback (not error status)
    return NextResponse.json({
      message: fallbackMessage,
      links: relevantKnowledge.length > 0 
        ? relevantKnowledge.flatMap(k => k.links).slice(0, 5)
        : [
            { title: 'Dashboard', url: '/dashboard' },
            { title: 'Inventory', url: '/inventory' },
            { title: 'Returns', url: '/returns' },
          ],
      suggestions: relevantKnowledge.length > 0 
        ? relevantKnowledge.flatMap(k => k.suggestions || []).slice(0, 4)
        : [
            'How do I add inventory?',
            'How to create a return?',
            'How to track shipments?',
            'What is warehouse receiving?',
          ],
    });
  }
}

