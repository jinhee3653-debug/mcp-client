"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Upload,
  Plus,
  Server,
  AlertTriangle,
} from "lucide-react";
import { useMCP } from "@/contexts/mcp-context";
import { ServerForm } from "@/components/mcp/server-form";
import { ServerList } from "@/components/mcp/server-list";
import { ServerDetail } from "@/components/mcp/server-detail";
import type { MCPExportConfig, MCPServerConfig } from "@/types/mcp";

export default function MCPPage() {
  const {
    servers,
    connectedServers,
    addServer,
    updateServer,
    removeServer,
    connectServer,
    disconnectServer,
    refreshCapabilities,
    getServerStatus,
    exportConfig,
    importConfig,
    isLoading,
  } = useMCP();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedServer = selectedServerId
    ? connectedServers.get(selectedServerId)
    : null;

  const handleExport = () => {
    const config = exportConfig();
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mcp-servers-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config: MCPExportConfig = JSON.parse(event.target?.result as string);
        if (config.version && config.servers) {
          importConfig(config);
          alert(`${config.servers.length}개의 서버 설정을 가져왔습니다.`);
        } else {
          alert("올바른 MCP 설정 파일이 아닙니다.");
        }
      } catch {
        alert("파일을 읽는 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <Server size={24} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  MCP 서버 관리
                </h1>
                <p className="text-sm text-zinc-500">
                  Model Context Protocol 서버 연결 및 관리
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              disabled={servers.length === 0}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              내보내기
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Upload size={18} />
              가져오기
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Security Warning */}
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">보안 경고</p>
              <p className="opacity-80">
                MCP 서버 설정은 브라우저의 localStorage에 저장됩니다. 공용 또는 공유
                컴퓨터에서는 민감한 정보(API 키 등)를 저장하지 않는 것이 좋습니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Server List & Add Form */}
          <div className="space-y-6">
            {/* Add/Edit Server Form */}
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <button
                onClick={() => {
                  if (editingServer) {
                    setEditingServer(null);
                  } else {
                    setShowAddForm(!showAddForm);
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                <span className="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                  <Plus size={18} />
                  {editingServer ? `서버 수정: ${editingServer.name}` : "새 서버 추가"}
                </span>
                <span
                  className={`transform transition-transform ${
                    showAddForm || editingServer ? "rotate-45" : ""
                  }`}
                >
                  <Plus size={18} className="text-zinc-400" />
                </span>
              </button>

              {(showAddForm || editingServer) && (
                <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                  <ServerForm
                    initialValues={editingServer || undefined}
                    isEditing={!!editingServer}
                    onSubmit={(config) => {
                      if (editingServer) {
                        updateServer(editingServer.id, config);
                        setEditingServer(null);
                      } else {
                        addServer(config);
                        setShowAddForm(false);
                      }
                    }}
                    onCancel={() => {
                      setShowAddForm(false);
                      setEditingServer(null);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Server List */}
            <div>
              <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                등록된 서버 ({servers.length})
              </h2>
              <ServerList
                servers={servers}
                selectedServerId={selectedServerId}
                getStatus={getServerStatus}
                onSelect={setSelectedServerId}
                onConnect={connectServer}
                onDisconnect={disconnectServer}
                onEdit={(server) => {
                  setEditingServer(server);
                  setShowAddForm(false);
                }}
                onDelete={removeServer}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Right Column: Server Detail */}
          <div>
            {selectedServer ? (
              <ServerDetail
                server={selectedServer}
                onRefresh={() =>
                  selectedServerId && refreshCapabilities(selectedServerId)
                }
              />
            ) : selectedServerId ? (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="text-center text-zinc-500">
                  <Server size={48} className="mx-auto mb-4 opacity-30" />
                  <p>서버에 연결하면 도구, 프롬프트, 리소스를 확인할 수 있습니다</p>
                  <button
                    onClick={() => connectServer(selectedServerId)}
                    disabled={isLoading}
                    className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    연결하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
                <div className="text-center text-zinc-500">
                  <Server size={48} className="mx-auto mb-4 opacity-30" />
                  <p>좌측에서 서버를 선택하거나 추가해주세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

