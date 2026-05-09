'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  ExternalLink,
  ChevronRight,
  Bot,
  GripVertical,
} from 'lucide-react';
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

const FAB_SIZE = 56;
const PANEL_W = 400;
const PANEL_H = 600;
const EDGE_MARGIN = 24;
const DRAG_THRESHOLD_PX = 6;
const POSITION_STORAGE_KEY = 'pharmacy-chatbot-anchor';

function clampAnchor(
  right: number,
  bottom: number,
  width: number,
  height: number
): { right: number; bottom: number } {
  if (typeof window === 'undefined') {
    return { right, bottom };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxRight = Math.max(EDGE_MARGIN, vw - EDGE_MARGIN - width);
  const maxBottom = Math.max(EDGE_MARGIN, vh - EDGE_MARGIN - height);
  return {
    right: Math.min(Math.max(EDGE_MARGIN, right), maxRight),
    bottom: Math.min(Math.max(EDGE_MARGIN, bottom), maxBottom),
  };
}

function readStoredAnchor(): { right: number; bottom: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { right?: unknown; bottom?: unknown };
    if (typeof p.right === 'number' && typeof p.bottom === 'number') {
      return { right: p.right, bottom: p.bottom };
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Hardcoded FAQ questions with instant answers (no API call needed)
const FAQ_QUESTIONS: Array<{ question: string; answer: string; links?: Array<{ title: string; url: string }> }> = [
  {
    question: 'How do I create a return?',
    answer:
      'To create a return:\n1. Click "Create Return" in the sidebar\n2. Scan barcodes or manually search for items to add\n3. Review the item list, confirm quantities and details\n4. Submit the return to move it to "Ready to Ship" status\n\nOnce submitted, pack your items securely and ship them. The system will track the shipment automatically.\n\nReturn status flow:\nDraft → Ready to Ship → In Transit → Processing → Completed\n\nYou can view all your returns and their real-time status on the Returns page. Click any return to see full details including item breakdown and expected credits.',
    links: [
      { title: 'All Returns', url: '/returns' },
      { title: 'Create New Return', url: '/returns/create' },
    ],
  },
  {
    question: 'How does the return process work?',
    answer:
      'Here is the complete returns workflow explained:\n\n1. Draft — Return is created but not yet submitted. You can still add or remove items.\n2. Ready to Ship — Return is confirmed. Pack and ship your items using the provided label.\n3. In Transit — Items are on their way to the processing warehouse. Tracking is active.\n4. Processing — Warehouse has received and is verifying your items against the return manifest.\n5. Completed — Verification done. Credits are calculated and applied to your account.\n\nSpecial item statuses:\n• TBD Items — Items flagged for additional review. They are held until a final decision is made on eligibility.\n• Destruction — Items not eligible for credit that are approved for proper pharmaceutical disposal.\n\nAll stages and history are visible from the Returns page.',
    links: [
      { title: 'All Returns', url: '/returns' },
      { title: 'TBD Items', url: '/returns/tbd-items' },
      { title: 'Destruction', url: '/returns/destruction' },
    ],
  },
  {
    question: 'How do payments and credits work?',
    answer:
      'Credits are earned based on items verified in your completed returns:\n\n• When a return reaches "Completed" status, each eligible item is assigned a credit value based on the product and its condition\n• Credits appear on the Credits page as both "Expected" and "Received" — expected credits show what is pending, received shows confirmed payments\n• Each credit entry is linked back to the original return so you can trace every dollar\n• A full itemized Credit Statement is available for accounting and reconciliation purposes\n• Credits are issued by the supplier/distributor after warehouse confirmation, not by the portal itself\n\nGo to Credits in the sidebar to view your full credit history and download statements.',
    links: [
      { title: 'Credits', url: '/credits' },
      { title: 'Credit Statement', url: '/credits/statement' },
    ],
  },
  {
    question: 'How do I manage roles and permissions?',
    answer:
      'Roles & Permissions gives you complete control over staff access (available to parent/admin accounts only):\n\nTo create a role:\n1. Go to Roles & Permissions in the sidebar\n2. Click "Create Role" and give it a name (e.g., "Staff", "Manager", "Viewer")\n3. Toggle permissions on/off for each section: Returns, Credits, Analytics, TBD Items, Destruction, Settings, etc.\n4. Save the role — it is now available to assign\n\nTo assign a role to a staff member:\n• Go to Branches, open a branch, and manage the staff list there\n• Each staff member can be assigned one role that defines exactly what they can see and do\n\nThis ensures sensitive data like credits and analytics is only visible to authorized staff.',
    links: [
      { title: 'Roles & Permissions', url: '/roles' },
      { title: 'Branches', url: '/branches' },
    ],
  },
];

export function Chatbot({ className }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState(() => readStoredAnchor() ?? { right: EDGE_MARGIN, bottom: EDGE_MARGIN });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hello! I'm your Pharmacy Portal Assistant. I can help you with inventory, returns operations, payments, and more.\n\nSelect a quick question below or type your own:",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [faqAnswered, setFaqAnswered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    startRight: number;
    startBottom: number;
    width: number;
    height: number;
  } | null>(null);
  const dragMovedRef = useRef(false);

  const persistAnchor = useCallback((next: { right: number; bottom: number }) => {
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => {
      const w = isOpen ? PANEL_W : FAB_SIZE;
      const h = isOpen ? PANEL_H : FAB_SIZE;
      setAnchor((prev) => clampAnchor(prev.right, prev.bottom, w, h));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFaqClick = (faq: (typeof FAQ_QUESTIONS)[number]) => {
    setFaqAnswered(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: faq.question,
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: faq.answer,
      links: faq.links,
      suggestions: FAQ_QUESTIONS.filter((q) => q.question !== faq.question).map((q) => q.question),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const faq = FAQ_QUESTIONS.find((q) => q.question === suggestion);
    if (faq) {
      handleFaqClick(faq);
    } else {
      setInput(suggestion);
      inputRef.current?.focus();
    }
  };

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
    setFaqAnswered(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

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
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          "I'm having trouble connecting right now. Please try again in a moment, or select one of the quick questions below.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startDrag = (
    e: React.PointerEvent,
    width: number,
    height: number,
    current: { right: number; bottom: number }
  ) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragMovedRef.current = false;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startRight: current.right,
      startBottom: current.bottom,
      width,
      height,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      dragMovedRef.current = true;
    }
    const nextRight = d.startRight - dx;
    const nextBottom = d.startBottom - dy;
    setAnchor(clampAnchor(nextRight, nextBottom, d.width, d.height));
  };

  const endFabDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
      if (dragMovedRef.current) {
        setAnchor((prev) => {
          const c = clampAnchor(prev.right, prev.bottom, FAB_SIZE, FAB_SIZE);
          persistAnchor(c);
          return c;
        });
        dragMovedRef.current = false;
        return;
      }
    }
    setIsOpen((o) => !o);
  };

  const endPanelHeaderDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragRef.current = null;
      if (dragMovedRef.current) {
        setAnchor((prev) => {
          const c = clampAnchor(prev.right, prev.bottom, PANEL_W, PANEL_H);
          persistAnchor(c);
          return c;
        });
      }
      dragMovedRef.current = false;
    }
  };

  const fabStyle = { right: anchor.right, bottom: anchor.bottom } as const;
  // Panel is much taller than the FAB: same anchor would push the header off-screen when the FAB sits high.
  const panelAnchor = clampAnchor(anchor.right, anchor.bottom, PANEL_W, PANEL_H);
  const panelStyle = { right: panelAnchor.right, bottom: panelAnchor.bottom } as const;

  return (
    <>
      {/* Floating Button — drag to reposition; click without dragging opens chat */}
      <button
        type="button"
        style={fabStyle}
        onPointerDown={(e) => startDrag(e, FAB_SIZE, FAB_SIZE, anchor)}
        onPointerMove={onDragMove}
        onPointerUp={endFabDrag}
        onPointerCancel={endFabDrag}
        className={`fixed z-50 flex h-14 w-14 touch-none select-none items-center justify-center rounded-full bg-[#1e3a5f] text-white shadow-lg hover:bg-[#16304f] transition-[opacity,transform] duration-300 cursor-grab active:cursor-grabbing ${
          isOpen ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'
        } ${className}`}
        aria-label="Open pharmacy assistant"
        title="Drag to move — click to open"
      >
        <MessageCircle className="h-6 w-6 pointer-events-none" />
      </button>

      {/* Chat Window */}
      <div
        style={panelStyle}
        className={`fixed z-50 flex h-[600px] w-[400px] flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl transition-[opacity,transform] duration-300 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header — drag handle when chat is open */}
        <div
          className="flex cursor-grab touch-none select-none items-center justify-between bg-[#1e3a5f] p-4 rounded-t-2xl active:cursor-grabbing"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button[aria-label="Close chatbot"]')) return;
            const origin = clampAnchor(anchor.right, anchor.bottom, PANEL_W, PANEL_H);
            startDrag(e, PANEL_W, PANEL_H, origin);
          }}
          onPointerMove={onDragMove}
          onPointerUp={endPanelHeaderDrag}
          onPointerCancel={endPanelHeaderDrag}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 pointer-events-none">
            <GripVertical className="h-5 w-5 shrink-0 text-white/70" aria-hidden />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-white">Pharmacy Assistant</h3>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                <p className="text-xs text-blue-200">Online — here to help</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="relative z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            aria-label="Close chatbot"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((message, idx) => (
            <div key={message.id}>
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {message.role === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] mt-1">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-[#1e3a5f] text-white rounded-tr-sm'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>

                  {/* Links */}
                  {message.links && message.links.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      <p className="text-xs font-semibold text-[#1e3a5f] mb-1">Quick Links:</p>
                      {message.links.map((link, i) => (
                        <Link
                          key={i}
                          href={link.url}
                          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => setIsOpen(false)}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          {link.title}
                        </Link>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                      <p className="text-xs font-semibold text-[#1e3a5f] mb-1">You might also ask:</p>
                      {message.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className="w-full text-left text-xs text-gray-700 hover:text-[#1e3a5f] hover:bg-blue-50 px-2 py-1.5 rounded-lg border border-gray-200 transition-colors flex items-center gap-1.5"
                        >
                          <ChevronRight className="h-3 w-3 shrink-0 text-[#1e3a5f]" />
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* FAQ Quick-Question Buttons shown after the welcome message */}
              {idx === 0 && !faqAnswered && (
                <div className="mt-3 ml-9 space-y-2">
                  {FAQ_QUESTIONS.map((faq, i) => (
                    <button
                      key={i}
                      onClick={() => handleFaqClick(faq)}
                      className="w-full text-left text-xs font-medium text-[#1e3a5f] bg-white hover:bg-blue-50 border border-blue-200 hover:border-[#1e3a5f] px-3 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                    >
                      <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                      {faq.question}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] mt-1">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white p-3 rounded-b-2xl">
          <div className="flex gap-2 items-center">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the pharmacy portal…"
              className="flex-1 h-10 px-4 text-sm rounded-full border border-gray-300 focus:outline-none focus:border-[#1e3a5f] focus:ring-1 focus:ring-[#1e3a5f] bg-gray-50 disabled:opacity-50"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-[#1e3a5f] hover:bg-[#16304f] text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            Only answers questions about this pharmacy portal
          </p>
        </div>
      </div>
    </>
  );
}
