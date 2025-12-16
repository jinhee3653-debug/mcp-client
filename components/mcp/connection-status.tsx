"use client";

import { useState } from "react";
import Link from "next/link";
import { Server, ChevronDown, Check, X, Loader2 } from "lucide-react";
import { useMCP } from "@/contexts/mcp-context";

export function ConnectionStatus() {
  const { servers, connectedServers, getServerStatus } = useMCP();
  const [isOpen, setIsOpen] = useState(false);

  const connectedCount = Array.from(connectedServers.values()).filter(
    (s) => s.status === "connected"
  ).length;
  const totalCount = servers.length;

  const hasConnected = connectedCount > 0;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          hasConnected
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        }`}
      >
        <Server size={16} />
        <span>
          MCP {connectedCount}/{totalCount}
        </span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                MCP 서버 상태
              </h3>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {servers.length === 0 ? (
                <div className="px-4 py-6 text-center text-zinc-500 text-sm">
                  등록된 서버가 없습니다
                </div>
              ) : (
                <div className="py-2">
                  {servers.map((server) => {
                    const status = getServerStatus(server.id);
                    return (
                      <div
                        key={server.id}
                        className="px-4 py-2 flex items-center gap-3"
                      >
                        <div
                          className={`p-1.5 rounded ${
                            status === "connected"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"
                              : status === "connecting"
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600"
                              : status === "error"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-600"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {status === "connected" ? (
                            <Check size={14} />
                          ) : status === "connecting" ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : status === "error" ? (
                            <X size={14} />
                          ) : (
                            <Server size={14} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {server.name}
                          </div>
                          <div className="text-xs text-zinc-500 capitalize">
                            {status === "connected"
                              ? "연결됨"
                              : status === "connecting"
                              ? "연결 중..."
                              : status === "error"
                              ? "오류"
                              : "연결 안됨"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-zinc-200 dark:border-zinc-800">
              <Link
                href="/mcp"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                서버 관리
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

