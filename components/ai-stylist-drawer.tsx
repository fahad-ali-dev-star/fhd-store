"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, X, Send, Bot, User, ArrowRight, ShoppingBag, Minimize2 } from "lucide-react";

interface ProductCard {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  category: string;
  image_url?: string | null;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
}

export function AIStylistDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I'm your FHD Personal Stylist. Tell me what vibe, occasion, or style you're dressing for today, or ask what to pair with your favorite shirt!",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  async function handleSend(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/stylist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply || "Here are a few pieces that would look fantastic on you:",
            products: data.recommendedProducts || [],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I couldn't fetch recommendations right now. Feel free to browse our categories or try asking another style question!",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I had a momentary connection hiccup. Please try again!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    "Summer outdoor dinner outfit",
    "Smart casual office shirt",
    "What goes well with khaki chinos?",
    "Best shirts under Rs 3,500",
  ];

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all border border-slate-700/50 group"
          aria-label="Open AI Personal Stylist"
        >
          <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
          </div>
          <span>AI Stylist</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
        </button>
      )}

      {/* Floating Stylist Drawer / Chat Box */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex h-[580px] max-h-[85vh] w-[92vw] sm:w-[420px] flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl animate-fade-in backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">FHD Personal Stylist</h3>
                <p className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Catalog-Grounded AI
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-800 border border-slate-200/60 shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.content}</p>

                  {/* Recommended Product Cards inside Chat */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-3 space-y-2 pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Recommended Pieces
                      </p>
                      {m.products.map((p) => (
                        <Link
                          key={p.id}
                          href={`/products/${p.slug}`}
                          onClick={() => setIsOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all group"
                        >
                          <div className="relative h-12 w-12 rounded-lg bg-slate-200 overflow-hidden shrink-0">
                            {p.image_url ? (
                              <Image src={p.image_url} alt={p.name} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs">
                                👕
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-xs text-slate-900 truncate group-hover:text-indigo-600">
                              {p.name}
                            </h5>
                            <span className="text-[11px] font-bold text-slate-700">
                              Rs {Number(p.base_price).toLocaleString()}
                            </span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {m.role === "user" && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 mt-0.5">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl bg-white border border-slate-200/60 px-4 py-3 shadow-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-slate-100 bg-white">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Prompts
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {quickPrompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleSend(q)}
                    className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 border-t border-slate-100 bg-white p-3 shrink-0"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for an outfit, event, or styling tip..."
              className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
