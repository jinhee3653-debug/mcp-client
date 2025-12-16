"use client";

import { useState } from "react";
import { Wrench, MessageSquareText, FolderOpen, AlertCircle, RefreshCw } from "lucide-react";
import type { MCPConnectedServer } from "@/types/mcp";
import { ToolExecutor } from "./tool-executor";
import { PromptExecutor } from "./prompt-executor";
import { ResourceReader } from "./resource-reader";

interface ServerDetailProps {
  server: MCPConnectedServer;
  onRefresh: () => void;
}

type TabType = "tools" | "prompts" | "resources";

export function ServerDetail({ server, onRefresh }: ServerDetailProps) {
  const [activeTab, setActiveTab] = useState<TabType>("tools");

  const { capabilities, status, error } = server;

  if (status === "error") {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
        <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle size={24} />
          <div>
            <h3 className="font-medium">연결 오류</h3>
            <p className="text-sm opacity-80">{error || "서버에 연결할 수 없습니다"}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "connecting") {
    return (
      <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
          <RefreshCw size={24} className="animate-spin" />
          <div>
            <h3 className="font-medium">연결 중...</h3>
            <p className="text-sm opacity-80">MCP 서버에 연결하고 있습니다</p>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "connected" || !capabilities) {
    return (
      <div className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
        <p className="text-zinc-500 text-center">서버에 연결되지 않았습니다</p>
      </div>
    );
  }

  const tabs = [
    {
      id: "tools" as const,
      label: "Tools",
      icon: Wrench,
      count: capabilities.tools.length,
    },
    {
      id: "prompts" as const,
      label: "Prompts",
      icon: MessageSquareText,
      count: capabilities.prompts.length,
    },
    {
      id: "resources" as const,
      label: "Resources",
      icon: FolderOpen,
      count: capabilities.resources.length + capabilities.resourceTemplates.length,
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
          {server.config.name}
        </h3>
        <button
          onClick={onRefresh}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
          title="새로고침"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-emerald-600 dark:text-emerald-400 border-b-2 border-emerald-600 dark:border-emerald-400 -mb-[1px]"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id
                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "tools" && (
          <ToolExecutor
            serverId={server.config.id}
            tools={capabilities.tools}
          />
        )}
        {activeTab === "prompts" && (
          <PromptExecutor
            serverId={server.config.id}
            prompts={capabilities.prompts}
          />
        )}
        {activeTab === "resources" && (
          <ResourceReader
            serverId={server.config.id}
            resources={capabilities.resources}
            resourceTemplates={capabilities.resourceTemplates}
          />
        )}
      </div>
    </div>
  );
}

