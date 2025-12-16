"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Square, Menu, Terminal, Check, Loader2, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ConnectionStatus } from "@/components/mcp/connection-status";
import { ChatSession, Message, ToolCall } from "@/types/chat";

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [useMcpTools, setUseMcpTools] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoad = useRef(true);

  // Helper to get current messages
  const currentSession = sessions.find((s) => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  // Load from LocalStorage
  useEffect(() => {
    if (!isInitialLoad.current) return;
    isInitialLoad.current = false;

    const savedSessions = localStorage.getItem("gemini-chat-sessions");
    let initialSessions: ChatSession[] = [];

    if (savedSessions) {
      try {
        initialSessions = JSON.parse(savedSessions);
      } catch (e) {
        console.error("Failed to parse chat sessions");
      }
    }

    setSessions(initialSessions);
    if (initialSessions.length > 0 && !currentSessionId) {
      setCurrentSessionId(initialSessions[0].id);
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (sessions.length > 0) {
        localStorage.setItem("gemini-chat-sessions", JSON.stringify(sessions));
    }
  }, [sessions]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: Date.now(),
    };
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);
    setIsSidebarOpen(false);
    if (abortControllerRef.current) {
        stopGeneration();
    }
  };

  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions((prev) => {
      const newSessions = prev.filter((s) => s.id !== sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(newSessions.length > 0 ? newSessions[0].id : null);
      }
      if (newSessions.length === 0) {
        localStorage.removeItem("gemini-chat-sessions");
      }
      return newSessions;
    });
  };

  const selectSession = (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    if (isLoading) {
        stopGeneration();
    }
    setCurrentSessionId(sessionId);
    setIsSidebarOpen(false);
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
    );
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const generateResponse = async (sessionId: string, messagesForApi: Message[]) => {
    setIsLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: messagesForApi,
          useMcpTools 
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || response.statusText);
        } catch (e) {
           throw e instanceof Error ? e : new Error(response.statusText);
        }
      }
      
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      
      // Initialize model message
      setSessions((prev) =>
        prev.map((session) => {
            if (session.id === sessionId) {
                return { ...session, messages: [...session.messages, { role: "model", content: "", toolCalls: [] }] };
            }
            return session;
        })
      );

      let accumulatedContent = "";
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                    const data = JSON.parse(line);
                    
                    if (data.type === 'text') {
                        accumulatedContent += data.content;
                        setSessions((prev) =>
                            prev.map((session) => {
                                if (session.id === sessionId) {
                                    const newMessages = [...session.messages];
                                    const lastMsg = newMessages[newMessages.length - 1];
                                    if (lastMsg.role === "model") {
                                        lastMsg.content = accumulatedContent;
                                        if (lastMsg.toolCalls) {
                                            lastMsg.toolCalls = lastMsg.toolCalls.map(tc => 
                                                tc.state === 'calling' ? { ...tc, state: 'result' } : tc
                                            );
                                        }
                                    }
                                    return { ...session, messages: newMessages };
                                }
                                return session;
                            })
                        );
                    } else if (data.type === 'tool_call') {
                        setSessions((prev) =>
                            prev.map((session) => {
                                if (session.id === sessionId) {
                                    const newMessages = [...session.messages];
                                    const lastMsg = newMessages[newMessages.length - 1];
                                    if (lastMsg.role === "model") {
                                        const newToolCall: ToolCall = {
                                            toolCallId: data.toolCallId,
                                            name: data.name,
                                            args: data.args,
                                            state: 'calling'
                                        };
                                        lastMsg.toolCalls = [...(lastMsg.toolCalls || []), newToolCall];
                                    }
                                    return { ...session, messages: newMessages };
                                }
                                return session;
                            })
                        );
                    } else if (data.type === 'error') {
                        console.error("Stream error:", data.error);
                    }
                } catch (e) {
                    console.debug("Error parsing line:", line);
                }
            }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Generation stopped by user");
      } else {
        console.error("Error sending message:", error);
        setSessions((prev) =>
            prev.map((session) => {
                if (session.id === sessionId) {
                     const msgs = session.messages;
                     const lastMsg = msgs[msgs.length - 1];
                     const errorMsg = `Error: ${error.message || "Could not fetch response."}`;
                     
                     if (lastMsg.role === 'model' && !lastMsg.content) {
                          return { 
                             ...session, 
                             messages: msgs.map((m, i) => i === msgs.length - 1 ? { ...m, content: errorMsg } : m)
                         };
                     } else if (lastMsg.role === 'model') {
                          return { 
                             ...session, 
                             messages: msgs.map((m, i) => i === msgs.length - 1 ? { ...m, content: m.content + (m.content ? "\n\n" : "") + errorMsg } : m)
                         };
                     } else {
                         return { ...session, messages: [...msgs, { role: "model", content: errorMsg }] };
                     }
                }
                return session;
            })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async (sessionId: string) => {
    if (isLoading) return;
    
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const messages = [...session.messages];
    const lastMsg = messages[messages.length - 1];
    
    if (lastMsg.role === 'model' && lastMsg.content.startsWith('Error:')) {
        const newMessages = messages.slice(0, -1);
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: newMessages } : s));
        await generateResponse(sessionId, newMessages);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    let targetSessionId = currentSessionId;
    if (!targetSessionId) {
        const newSession: ChatSession = {
            id: crypto.randomUUID(),
            title: "New Chat",
            messages: [],
            createdAt: Date.now(),
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        targetSessionId = newSession.id;
    }

    const userMessage: Message = { role: "user", content: input };
    
    setSessions((prev) =>
        prev.map((session) => {
            if (session.id === targetSessionId) {
                const updatedMessages = [...session.messages, userMessage];
                const title = session.messages.length === 0 && session.title === "New Chat" 
                    ? input.slice(0, 30) + (input.length > 30 ? "..." : "")
                    : session.title;
                return { ...session, messages: updatedMessages, title };
            }
            return session;
        })
    );

    setInput("");
    
    const sessionForApi = sessions.find(s => s.id === targetSessionId);
    let messagesForApi: Message[] = [];
    if (sessionForApi) {
        messagesForApi = [...sessionForApi.messages, userMessage];
    } else {
         messagesForApi = [userMessage];
    }

    await generateResponse(targetSessionId, messagesForApi);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      
      <ChatSidebar
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onCreateSession={createNewSession}
        onDeleteSession={deleteSession}
        onRenameSession={handleRenameSession}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full relative w-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-1 mr-2 text-zinc-500 hover:text-zinc-700"
            >
                <Menu size={20} />
            </button>
            <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-semibold truncate">
                {currentSession?.title || "Gemini Chat"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setUseMcpTools(!useMcpTools)}
              className={`text-sm px-3 py-1.5 rounded-full transition-colors border ${
                useMcpTools 
                  ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" 
                  : "bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              MCP Tools: {useMcpTools ? "ON" : "OFF"}
            </button>
            <ConnectionStatus />
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(!currentSessionId || messages.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-400">
              <Bot className="w-12 h-12 mb-4 opacity-20" />
              <p>Start a new conversation with Gemini</p>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-4 ${
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-green-600 text-white"
                }`}
              >
                {msg.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div className="flex flex-col gap-2 max-w-[85%]">
                {/* Tool Calls Visualization */}
                {msg.toolCalls && msg.toolCalls.map((toolCall, i) => (
                    <div key={i} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-sm">
                        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                            <Terminal size={14} />
                            <span className="font-medium font-mono text-xs">{toolCall.name}</span>
                            <span className="ml-auto text-xs opacity-70">
                                {toolCall.state === 'calling' ? (
                                    <span className="flex items-center gap-1">
                                        <Loader2 size={10} className="animate-spin" /> Calling...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <Check size={10} /> Done
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="p-3 font-mono text-xs text-zinc-700 dark:text-zinc-300 overflow-x-auto">
                            <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
                        </div>
                    </div>
                ))}

                {/* Text Content */}
                {msg.content && (
                    <div
                        className={`rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                            ? "bg-blue-600 text-white whitespace-pre-wrap"
                            : "bg-zinc-100 dark:bg-zinc-800 w-full overflow-hidden"
                        }`}
                    >
                        {msg.role === "model" ? (
                        <Markdown content={msg.content} />
                        ) : (
                        msg.content
                        )}
                    </div>
                )}
                
                {msg.role === "model" && msg.content.startsWith("Error:") && !isLoading && currentSessionId && (
                  <button
                    onClick={() => handleRetry(currentSessionId)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors font-medium"
                  >
                    <RotateCcw size={14} />
                    다시 시도
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
                <span className="animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <div className="flex flex-col gap-2 max-w-3xl mx-auto">
            {isLoading && (
              <div className="flex justify-center">
                <button
                  onClick={stopGeneration}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-full hover:bg-red-500/20 transition-colors text-sm font-medium"
                >
                  <Square size={14} className="fill-current" />
                  Stop generating
                </button>
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="flex items-end gap-2 border border-zinc-300 dark:border-zinc-700 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all bg-white dark:bg-zinc-950"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message... (Tip: Ask about libraries to test MCP)"
                rows={1}
                className="flex-1 bg-transparent outline-none py-3 resize-none max-h-48 overflow-y-auto"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="mb-1.5 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
