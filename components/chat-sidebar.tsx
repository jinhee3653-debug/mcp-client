import { MessageSquare, Plus, Trash2, X, Edit2, Check } from "lucide-react";
import { ChatSession } from "@/types/chat";
import { useState, useRef, useEffect } from "react";

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string, e: React.MouseEvent) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatSidebar({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onClose,
}: ChatSidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingSessionId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingSessionId]);

  const startEditing = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = (e?: React.MouseEvent | React.FormEvent) => {
    e?.stopPropagation();
    if (editingSessionId && editTitle.trim()) {
      onRenameSession(editingSessionId, editTitle.trim());
      setEditingSessionId(null);
    }
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingSessionId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveTitle();
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } flex flex-col`}
      >
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Chats
          </h2>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-2">
          <button
            onClick={onCreateSession}
            className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No chat history
            </div>
          )}
          
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              className={`group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors text-sm ${
                currentSessionId === session.id
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              <MessageSquare size={16} className="shrink-0" />
              
              {editingSessionId === session.id ? (
                <div className="flex-1 flex items-center gap-1 min-w-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-0 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={saveTitle}
                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="truncate flex-1 text-left">
                    {session.title || "New Chat"}
                  </span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                     <button
                      onClick={(e) => startEditing(session, e)}
                      className="p-1.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                      title="Rename chat"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="p-1.5 rounded-md hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                      title="Delete chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
