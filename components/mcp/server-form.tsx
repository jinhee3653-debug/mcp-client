"use client";

import { useState } from "react";
import { Plus, Server, Globe, Zap } from "lucide-react";
import type { MCPTransportType, MCPServerConfig } from "@/types/mcp";

interface ServerFormProps {
  onSubmit: (config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">) => void;
  onCancel?: () => void;
  initialValues?: Partial<MCPServerConfig>;
  isEditing?: boolean;
}

export function ServerForm({ onSubmit, onCancel, initialValues, isEditing }: ServerFormProps) {
  const [name, setName] = useState(initialValues?.name || "");
  const [type, setType] = useState<MCPTransportType>(initialValues?.type || "stdio");
  const [command, setCommand] = useState(initialValues?.command || "");
  const [args, setArgs] = useState(initialValues?.args?.join(" ") || "");
  const [envVars, setEnvVars] = useState(
    initialValues?.env ? Object.entries(initialValues.env).map(([k, v]) => `${k}=${v}`).join("\n") : ""
  );
  const [url, setUrl] = useState(initialValues?.url || "");
  const [headers, setHeaders] = useState(
    initialValues?.headers
      ? Object.entries(initialValues.headers).map(([k, v]) => `${k}: ${v}`).join("\n")
      : ""
  );
  const [autoConnect, setAutoConnect] = useState(initialValues?.autoConnect ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt"> = {
      name,
      type,
      autoConnect,
    };

    if (type === "stdio") {
      config.command = command;
      config.args = args.trim() ? args.split(/\s+/) : [];
      if (envVars.trim()) {
        config.env = {};
        envVars.split("\n").forEach((line) => {
          const [key, ...valueParts] = line.split("=");
          if (key && valueParts.length > 0) {
            config.env![key.trim()] = valueParts.join("=").trim();
          }
        });
      }
    } else {
      config.url = url;
      if (headers.trim()) {
        config.headers = {};
        headers.split("\n").forEach((line) => {
          const [key, ...valueParts] = line.split(":");
          if (key && valueParts.length > 0) {
            config.headers![key.trim()] = valueParts.join(":").trim();
          }
        });
      }
    }

    onSubmit(config);
    
    if (!isEditing) {
      // Reset form
      setName("");
      setCommand("");
      setArgs("");
      setEnvVars("");
      setUrl("");
      setHeaders("");
      setAutoConnect(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
          서버 이름
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My MCP Server"
          required
          className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Auto-connect toggle */}
      <div
        onClick={() => setAutoConnect(!autoConnect)}
        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
          autoConnect
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
            : "bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700"
        }`}
      >
        <div
          className={`p-1.5 rounded ${
            autoConnect
              ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
              : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
          }`}
        >
          <Zap size={16} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            자동 연결
          </p>
          <p className="text-xs text-zinc-500">
            페이지 로드 시 자동으로 서버에 연결합니다
          </p>
        </div>
        <div
          className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
            autoConnect ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              autoConnect ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          트랜스포트 타입
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setType("stdio")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              type === "stdio"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
          >
            <Server size={18} />
            <span>STDIO</span>
          </button>
          <button
            type="button"
            onClick={() => setType("streamable-http")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
              type === "streamable-http"
                ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            }`}
          >
            <Globe size={18} />
            <span>HTTP</span>
          </button>
        </div>
      </div>

      {type === "stdio" ? (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              커맨드
            </label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npx, node, python, etc."
              required
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              인자 (Arguments)
            </label>
            <input
              type="text"
              value={args}
              onChange={(e) => setArgs(e.target.value)}
              placeholder="-y @modelcontextprotocol/server-filesystem /path"
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-xs text-zinc-500 mt-1">공백으로 구분된 인자들</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              환경 변수 (선택)
            </label>
            <textarea
              value={envVars}
              onChange={(e) => setEnvVars(e.target.value)}
              placeholder={"API_KEY=your-key\nANOTHER_VAR=value"}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm resize-none"
            />
            <p className="text-xs text-zinc-500 mt-1">줄당 KEY=VALUE 형식</p>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://mcp-server.example.com/mcp"
              required
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              헤더 (선택)
            </label>
            <textarea
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
              placeholder={"Authorization: Bearer your-token\nX-Custom-Header: value"}
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm resize-none"
            />
            <p className="text-xs text-zinc-500 mt-1">줄당 Header-Name: value 형식</p>
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus size={18} />
          {isEditing ? "수정" : "서버 추가"}
        </button>
      </div>
    </form>
  );
}

