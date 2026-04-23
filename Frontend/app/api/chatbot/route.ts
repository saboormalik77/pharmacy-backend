import { NextRequest, NextResponse } from 'next/server';
import { findRelevantKnowledge } from '@/data/chatbotKnowledge';

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are an intelligent pharmacy portal assistant embedded in a pharmaceutical returns and inventory management system.

SCOPE: You ONLY answer questions about these active portal features:
- Returns (create, track, TBD items, destruction)
- Credits (credit history, statements, calculations)
- Analytics & Reports
- Settings (profile, store settings, license documents, password)
- Branches (multiple locations — parent accounts only)
- Roles & Permissions (staff access control — parent accounts only)

OUT-OF-SCOPE RULE: If the user asks about anything unrelated to this pharmacy portal (cooking, sports, weather, general knowledge, other industries, personal topics, etc.), respond ONLY with:
"This question is outside the scope of what I can help with. I'm only able to answer questions about the pharmacy management portal."

CONVERSATION CONTEXT RULES:
- You have the full conversation history. USE IT.
- If the user asks a follow-up question that references earlier context, answer based on that context.
- Do NOT repeat information already given in the same conversation unless explicitly asked again.
- If the user said "what about X?" or "and Y?" treat it as a follow-up to the previous topic.

ANSWER SPECIFICITY RULES — THIS IS CRITICAL:
- First, identify what the user is SPECIFICALLY asking. Match your answer to EXACTLY that.
- "How do I X?" or "How to X?" → Give ONLY the steps for that specific task. Do NOT describe the entire feature/page.
  WRONG: "To upload a license document, go to Settings where you can manage your profile, store settings, and security..."
  RIGHT: "To upload a license document: 1. Go to Settings 2. Click Edit Profile 3. Scroll to MY DOCUMENTS section 4. Click the upload area under State Pharmacy License 5. Choose your file 6. Save."
- "What is X?" or "Tell me about X?" → Give an overview of that specific thing.
- "Where do I find X?" → Just say where it is, nothing more.
- Short follow-up question → Short focused answer using prior conversation context.
- Keep answers concise and match the length to what was asked. Never pad with unrelated details.

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
      console.warn('Azure OpenAI not configured, using fallback response');

      // ALWAYS try current message first — never let previous context override it
      if (relevantKnowledge.length > 0) {
        return NextResponse.json({
          message: relevantKnowledge[0].content,
          links: relevantKnowledge[0].links.slice(0, 5),
          suggestions: (relevantKnowledge[0].suggestions ?? []).slice(0, 4),
        });
      }

      // Only if current message found nothing, try enriching with recent context
      // (handles vague follow-ups like "and that?" or "what about it?")
      const wordCount = userMessage.trim().split(/\s+/).length;
      if (wordCount <= 4 && conversationHistory.length > 0) {
        const lastUserMsg = [...conversationHistory]
          .reverse()
          .find((m: { role: string }) => m.role === 'user');
        const contextHint = lastUserMsg?.content || '';
        const enrichedQuery = `${contextHint} ${userMessage}`;
        const contextualKnowledge = findRelevantKnowledge(enrichedQuery);

        if (contextualKnowledge.length > 0) {
          return NextResponse.json({
            message: contextualKnowledge[0].content,
            links: contextualKnowledge[0].links.slice(0, 5),
            suggestions: (contextualKnowledge[0].suggestions ?? []).slice(0, 4),
          });
        }
      }

      return NextResponse.json({
        message:
          "I don't have specific information about that. I can help with:\n• Returns (creating, tracking, status)\n• Credits & statements\n• Settings (profile, store settings, documents, password)\n• Branches & Roles\n\nTry asking about one of these, or select a quick question below.",
        links: [
          { title: 'Returns', url: '/returns' },
          { title: 'Credits', url: '/credits' },
          { title: 'Settings', url: '/settings' },
        ],
        suggestions: [
          'How do I create a return?',
          'How do credits work?',
          'How to change my password?',
          'How to manage roles?',
        ],
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

    const fallbackKnowledge = findRelevantKnowledge(userMessage);
    const fallbackMessage =
      fallbackKnowledge.length > 0
        ? fallbackKnowledge[0].content
        : "This question is outside the scope of what I can help with. I'm only able to answer questions about the pharmacy management portal. Please ask me about returns, credits, settings, branches, or roles.";

    return NextResponse.json({
      message: fallbackMessage,
      links: fallbackKnowledge.flatMap((k) => k.links).slice(0, 5),
      suggestions: fallbackKnowledge.flatMap((k) => k.suggestions ?? []).slice(0, 4),
    });
  }
}

