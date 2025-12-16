"use client";

import { Server, Globe, Plug, PlugZap, Trash2, RefreshCw, ChevronRight, Zap, Pencil } from "lucide-react";
import type { MCPServerConfig, MCPConnectionStatus } from "@/types/mcp";

interface ServerListProps {
  servers: MCPServerConfig[];
  selectedServerId: string | null;
  getStatus: (id: string) => MCPConnectionStatus;
  onSelect: (id: string) => void;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onEdit: (server: MCPServerConfig) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

function StatusBadge({ status }: { status: MCPConnectionStatus }) {
  const config = {
    connected: {
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
      text: "text-emerald-700 dark:text-emerald-300",
      dot: "bg-emerald-500",
      label: "연결됨",
    },
    connecting: {
      bg: "bg-amber-100 dark:bg-amber-900/30",
      text: "text-amber-700 dark:text-amber-300",
      dot: "bg-amber-500 animate-pulse",
      label: "연결 중...",
    },
    disconnected: {
      bg: "bg-zinc-100 dark:bg-zinc-800",
      text: "text-zinc-600 dark:text-zinc-400",
      dot: "bg-zinc-400",
      label: "연결 안됨",
    },
    error: {
      bg: "bg-red-100 dark:bg-red-900/30",
      text: "text-red-700 dark:text-red-300",
      dot: "bg-red-500",
      label: "오류",
    },
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function ServerList({
  servers,
  selectedServerId,
  getStatus,
  onSelect,
  onConnect,
  onDisconnect,
  onEdit,
  onDelete,
  isLoading,
}: ServerListProps) {
  if (servers.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Server size={48} className="mx-auto mb-4 opacity-30" />
        <p>등록된 MCP 서버가 없습니다</p>
        <p className="text-sm mt-1">위 폼에서 서버를 추가해주세요</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {servers.map((server) => {
        const status = getStatus(server.id);
        const isSelected = selectedServerId === server.id;
        const isConnected = status === "connected";
        const isConnecting = status === "connecting";

        return (
          <div
            key={server.id}
            onClick={() => onSelect(server.id)}
            className={`group p-4 rounded-xl border cursor-pointer transition-all ${
              isSelected
                ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  isConnected
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                }`}
              >
                {server.type === "stdio" ? <Server size={20} /> : <Globe size={20} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {server.name}
                  </h3>
                  <StatusBadge status={status} />
                  {server.autoConnect && (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      title="자동 연결 활성화"
                    >
                      <Zap size={10} />
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate mt-0.5 font-mono">
                  {server.type === "stdio" ? server.command : server.url}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isConnected ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisconnect(server.id);
                    }}
                    disabled={isLoading}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
                    title="연결 해제"
                  >
                    <PlugZap size={18} />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onConnect(server.id);
                    }}
                    disabled={isLoading || isConnecting}
                    className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 transition-colors disabled:opacity-50"
                    title="연결"
                  >
                    {isConnecting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Plug size={18} />
                    )}
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(server);
                  }}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                  title="수정"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("정말로 이 서버를 삭제하시겠습니까?")) {
                      onDelete(server.id);
                    }
                  }}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  title="삭제"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <ChevronRight
                size={18}
                className={`text-zinc-400 transition-transform ${
                  isSelected ? "rotate-90" : ""
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

