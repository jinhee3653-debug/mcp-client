"use client";

import { useState } from "react";
import { FileText, FolderOpen, AlertCircle, Check } from "lucide-react";
import type { MCPResource, MCPResourceTemplate, MCPApiResponse, MCPResourceReadResult } from "@/types/mcp";

interface ResourceReaderProps {
  serverId: string;
  resources: MCPResource[];
  resourceTemplates: MCPResourceTemplate[];
}

export function ResourceReader({ serverId, resources, resourceTemplates }: ResourceReaderProps) {
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [result, setResult] = useState<MCPResourceReadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [customUri, setCustomUri] = useState("");

  if (resources.length === 0 && resourceTemplates.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
        <p>사용 가능한 Resource가 없습니다</p>
      </div>
    );
  }

  const handleRead = async (uri: string) => {
    setIsReading(true);
    setError(null);
    setResult(null);
    setSelectedUri(uri);

    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/resources/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uri }),
      });

      const data: MCPApiResponse<MCPResourceReadResult> = await response.json();

      if (data.success && data.data) {
        setResult(data.data);
      } else {
        setError(data.error || "Resource 읽기에 실패했습니다");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Resource 읽기 중 오류가 발생했습니다");
    } finally {
      setIsReading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Resources */}
      {resources.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <FileText size={16} />
            Resources
          </h4>
          <div className="space-y-2">
            {resources.map((resource) => (
              <button
                key={resource.uri}
                onClick={() => handleRead(resource.uri)}
                disabled={isReading}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedUri === resource.uri
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                    : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                } disabled:opacity-50`}
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                  {resource.name}
                </div>
                <div className="text-xs text-zinc-500 font-mono truncate">
                  {resource.uri}
                </div>
                {resource.description && (
                  <div className="text-xs text-zinc-400 mt-1">{resource.description}</div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resource Templates */}
      {resourceTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-2">
            <FolderOpen size={16} />
            Resource Templates
          </h4>
          <div className="space-y-2">
            {resourceTemplates.map((template) => (
              <div
                key={template.uriTemplate}
                className="p-3 rounded-lg border bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                  {template.name}
                </div>
                <div className="text-xs text-zinc-500 font-mono">
                  {template.uriTemplate}
                </div>
                {template.description && (
                  <div className="text-xs text-zinc-400 mt-1">{template.description}</div>
                )}
              </div>
            ))}
          </div>

          {/* Custom URI Input */}
          <div className="mt-3">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Custom URI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUri}
                onChange={(e) => setCustomUri(e.target.value)}
                placeholder="file:///path/to/file"
                className="flex-1 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm font-mono"
              />
              <button
                onClick={() => customUri && handleRead(customUri)}
                disabled={isReading || !customUri}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                읽기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isReading && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-center">
          <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-2">읽는 중...</p>
        </div>
      )}

      {/* Result */}
      {result && !isReading && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-2">
            <Check size={16} />
            <span className="font-medium">Resource 내용</span>
          </div>
          {result.contents.map((content, i) => (
            <div key={i} className="mt-2">
              <div className="text-xs text-zinc-500 font-mono mb-1">
                {content.uri}
                {content.mimeType && ` (${content.mimeType})`}
              </div>
              <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto font-mono bg-white dark:bg-zinc-900 p-2 rounded border border-zinc-200 dark:border-zinc-700 max-h-64 overflow-y-auto">
                {content.text || (content.blob ? "[Binary content]" : "[Empty]")}
              </pre>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isReading && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

