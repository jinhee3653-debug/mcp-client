"use client";

import { useState } from "react";
import { Play, ChevronDown, ChevronUp, AlertCircle, Check } from "lucide-react";
import type { MCPTool, MCPApiResponse, MCPToolExecuteResult } from "@/types/mcp";

interface ToolExecutorProps {
  serverId: string;
  tools: MCPTool[];
}

export function ToolExecutor({ serverId, tools }: ToolExecutorProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<MCPToolExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  if (tools.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>사용 가능한 Tool이 없습니다</p>
      </div>
    );
  }

  const handleExecute = async (toolName: string) => {
    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      // Parse args as JSON if possible
      let parsedArgs: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(args)) {
        try {
          parsedArgs[key] = JSON.parse(value);
        } catch {
          parsedArgs[key] = value;
        }
      }

      const response = await fetch(`/api/mcp/servers/${serverId}/tools/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolName, arguments: parsedArgs }),
      });

      const data: MCPApiResponse<MCPToolExecuteResult> = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || "Tool 실행에 실패했습니다");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tool 실행 중 오류가 발생했습니다");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-3">
      {tools.map((tool) => {
        const isExpanded = expandedTool === tool.name;
        const schema = tool.inputSchema as {
          properties?: Record<string, { type?: string; description?: string }>;
          required?: string[];
        } | undefined;

        return (
          <div
            key={tool.name}
            className="border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => {
                setExpandedTool(isExpanded ? null : tool.name);
                setArgs({});
                setResult(null);
                setError(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
            >
              <div className="flex-1">
                <h4 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {tool.name}
                </h4>
                {tool.description && (
                  <p className="text-sm text-zinc-500 mt-0.5">{tool.description}</p>
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
                {/* Input Schema */}
                {schema?.properties && Object.keys(schema.properties).length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {Object.entries(schema.properties).map(([key, prop]) => (
                      <div key={key}>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          {key}
                          {schema.required?.includes(key) && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </label>
                        {prop.description && (
                          <p className="text-xs text-zinc-500 mb-1">{prop.description}</p>
                        )}
                        <input
                          type="text"
                          value={args[key] || ""}
                          onChange={(e) =>
                            setArgs((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder={prop.type || "value"}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 mb-4">입력 파라미터가 없습니다</p>
                )}

                <button
                  onClick={() => handleExecute(tool.name)}
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
                      <span className="font-medium">실행 결과</span>
                    </div>
                    <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto font-mono">
                      {result.content.map((c, i) => (
                        <div key={i}>
                          {c.text || (c.data ? `[Binary data: ${c.mimeType}]` : "[Empty]")}
                        </div>
                      ))}
                    </pre>
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

