"use client";

import { useState } from "react";
import { Play, ChevronDown, ChevronUp, AlertCircle, Check } from "lucide-react";
import type { MCPPrompt, MCPApiResponse, MCPPromptGetResult } from "@/types/mcp";

interface PromptExecutorProps {
  serverId: string;
  prompts: MCPPrompt[];
}

export function PromptExecutor({ serverId, prompts }: PromptExecutorProps) {
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MCPPromptGetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (prompts.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>사용 가능한 Prompt가 없습니다</p>
      </div>
    );
  }

  const handleExecute = async (promptName: string) => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/prompts/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptName, arguments: args }),
      });

      const data: MCPApiResponse<MCPPromptGetResult> = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || "Prompt 실행에 실패했습니다");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prompt 실행 중 오류가 발생했습니다");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-3">
      {prompts.map((prompt) => {
        const isExpanded = expandedPrompt === prompt.name;

        return (
          <div
            key={prompt.name}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => {
                setExpandedPrompt(isExpanded ? null : prompt.name);
                setArgs({});
                setResult(null);
                setError(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="flex-1">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {prompt.name}
                </h4>
                {prompt.description && (
                  <p className="text-sm text-zinc-500 mt-0.5">{prompt.description}</p>
                )}
              </div>
              {isExpanded ? (
                <ChevronUp size={18} className="text-zinc-400" />
              ) : (
                <ChevronDown size={18} className="text-zinc-400" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                {/* Arguments */}
                {prompt.arguments && prompt.arguments.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {prompt.arguments.map((arg) => (
                      <div key={arg.name}>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          {arg.name}
                          {arg.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {arg.description && (
                          <p className="text-xs text-zinc-500 mb-1">{arg.description}</p>
                        )}
                        <input
                          type="text"
                          value={args[arg.name] || ""}
                          onChange={(e) =>
                            setArgs((prev) => ({ ...prev, [arg.name]: e.target.value }))
                          }
                          placeholder="value"
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 mb-4">입력 인자가 없습니다</p>
                )}

                <button
                  onClick={() => handleExecute(prompt.name)}
                  disabled={isExecuting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isExecuting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      실행 중...
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      실행
                    </>
                  )}
                </button>

                {/* Result */}
                {result && (
                  <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-2">
                      <Check size={16} />
                      <span className="font-medium">Prompt 결과</span>
                    </div>
                    {result.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {result.description}
                      </p>
                    )}
                    <div className="space-y-2">
                      {result.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded text-sm ${
                            msg.role === "user"
                              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          <span className="font-medium capitalize">{msg.role}:</span>{" "}
                          {msg.content.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <AlertCircle size={16} />
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

