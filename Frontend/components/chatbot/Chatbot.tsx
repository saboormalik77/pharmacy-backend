'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  links?: Array<{ title: string; url: string }>;
  suggestions?: string[];
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export function Chatbot({ className }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your pharmacy assistant. I can help you with inventory management, returns, shipments, warehouse operations, payments, and more. What would you like to know?',
      suggestions: [
        'How do I add inventory?',
        'How to create a return?',
        'What is warehouse receiving?',
        'How to track shipments?'
      ],
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        links: data.links || [],
        suggestions: data.suggestions || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} ${className}`}
        aria-label="Open chatbot"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {/* Chat Window */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex h-[600px] w-[400px] flex-col rounded-lg border-2 border-teal-200 bg-white shadow-2xl transition-all duration-300 ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-teal-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 p-4 rounded-t-lg">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-teal-100">
              <MessageCircle className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">Pharmacy Assistant</h3>
              <p className="text-xs text-gray-600">How can I help you?</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0 hover:bg-teal-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white to-teal-50/20">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                    : 'bg-white border-2 border-teal-200 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Links */}
                {message.links && message.links.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-teal-200 pt-3">
                    <p className="text-xs font-semibold text-teal-700 mb-2">Helpful Links:</p>
                    {message.links.map((link, idx) => (
                      <Link
                        key={idx}
                        href={link.url}
                        className="flex items-center gap-2 text-xs text-teal-600 hover:text-teal-800 hover:underline"
                        onClick={() => setIsOpen(false)}
                      >
                        <ExternalLink className="h-3 w-3" />
                        {link.title}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-teal-200 pt-3">
                    <p className="text-xs font-semibold text-teal-700 mb-2">Suggestions:</p>
                    {message.suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left text-xs text-teal-600 hover:text-teal-800 hover:bg-teal-50 p-2 rounded border border-teal-200 transition-colors flex items-center gap-2"
                      >
                        <ChevronRight className="h-3 w-3" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-teal-200 rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t-2 border-teal-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-teal-50 p-4 rounded-b-lg">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 h-10 text-sm border-teal-200 focus:border-teal-400"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="bg-teal-600 hover:bg-teal-700 text-white border-0 h-10 px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

