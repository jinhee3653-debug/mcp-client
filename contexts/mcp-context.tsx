"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type {
  MCPServerConfig,
  MCPConnectionStatus,
  MCPConnectedServer,
  MCPServerCapabilities,
  MCPApiResponse,
  MCPExportConfig,
} from "@/types/mcp";

const MCP_STORAGE_KEY = "mcp-servers";

interface MCPContextType {
  // Server configurations (persisted in localStorage)
  servers: MCPServerConfig[];
  // Connection states (runtime only)
  connectedServers: Map<string, MCPConnectedServer>;
  // Actions
  addServer: (config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">) => MCPServerConfig;
  updateServer: (id: string, config: Partial<Omit<MCPServerConfig, "id" | "createdAt">>) => void;
  removeServer: (id: string) => Promise<void>;
  connectServer: (id: string) => Promise<void>;
  disconnectServer: (id: string) => Promise<void>;
  refreshCapabilities: (id: string) => Promise<void>;
  getServerStatus: (id: string) => MCPConnectionStatus;
  // Import/Export
  exportConfig: () => MCPExportConfig;
  importConfig: (config: MCPExportConfig) => void;
  // Utility
  isLoading: boolean;
}

const MCPContext = createContext<MCPContextType | null>(null);

export function MCPProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<MCPServerConfig[]>([]);
  const [connectedServers, setConnectedServers] = useState<Map<string, MCPConnectedServer>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load servers from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const stored = localStorage.getItem(MCP_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as MCPServerConfig[];
        setServers(parsed);
      } catch (e) {
        console.error("Failed to parse MCP servers from localStorage:", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save servers to localStorage when changed
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem(MCP_STORAGE_KEY, JSON.stringify(servers));
  }, [servers, isInitialized]);

  // Helper function to fetch capabilities for a server
  const fetchCapabilities = async (serverId: string): Promise<MCPServerCapabilities | null> => {
    try {
      const [toolsRes, promptsRes, resourcesRes] = await Promise.all([
        fetch(`/api/mcp/servers/${serverId}/tools`),
        fetch(`/api/mcp/servers/${serverId}/prompts`),
        fetch(`/api/mcp/servers/${serverId}/resources`),
      ]);

      const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
        toolsRes.json(),
        promptsRes.json(),
        resourcesRes.json(),
      ]);

      return {
        tools: toolsResult.success ? toolsResult.data : [],
        prompts: promptsResult.success ? promptsResult.data : [],
        resources: resourcesResult.success ? resourcesResult.data.resources : [],
        resourceTemplates: resourcesResult.success ? resourcesResult.data.resourceTemplates : [],
      };
    } catch (error) {
      console.error(`Failed to fetch capabilities for ${serverId}:`, error);
      return null;
    }
  };

  // Auto-connect servers on mount
  useEffect(() => {
    if (!isInitialized || servers.length === 0) return;

    const autoConnectServers = async () => {
      // First, check current server-side status
      try {
        const response = await fetch("/api/mcp/status");
        const result: MCPApiResponse<string[]> = await response.json();
        const alreadyConnected = new Set(result.success && result.data ? result.data : []);

        // Filter servers that need auto-connect
        const serversToConnect = servers.filter(
          (s) => s.autoConnect && !alreadyConnected.has(s.id)
        );

        // Restore status and fetch capabilities for already connected servers
        if (alreadyConnected.size > 0) {
          for (const serverId of alreadyConnected) {
            const serverConfig = servers.find((s) => s.id === serverId);
            if (serverConfig) {
              // First set status to connected (without capabilities)
              setConnectedServers((prev) => {
                const newMap = new Map(prev);
                if (!newMap.has(serverId)) {
                  newMap.set(serverId, {
                    config: serverConfig,
                    status: "connected",
                  });
                }
                return newMap;
              });

              // Then fetch and update capabilities
              const capabilities = await fetchCapabilities(serverId);
              if (capabilities) {
                setConnectedServers((prev) => {
                  const newMap = new Map(prev);
                  newMap.set(serverId, {
                    config: serverConfig,
                    status: "connected",
                    capabilities,
                  });
                  return newMap;
                });
              }
            }
          }
        }

        // Connect to autoConnect servers sequentially
        for (const server of serversToConnect) {
          try {
            await connectServerInternal(server);
          } catch (error) {
            console.error(`Failed to auto-connect to ${server.name}:`, error);
          }
        }
      } catch (error) {
        console.error("Failed to fetch MCP status:", error);
      }
    };

    autoConnectServers();
    // Only run on initial mount, not on every servers change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialized]);

  const addServer = useCallback(
    (config: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">): MCPServerConfig => {
      const newServer: MCPServerConfig = {
        ...config,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setServers((prev) => [...prev, newServer]);
      return newServer;
    },
    []
  );

  const updateServer = useCallback(
    (id: string, config: Partial<Omit<MCPServerConfig, "id" | "createdAt">>) => {
      setServers((prev) =>
        prev.map((server) =>
          server.id === id
            ? { ...server, ...config, updatedAt: Date.now() }
            : server
        )
      );
    },
    []
  );

  const removeServer = useCallback(async (id: string) => {
    // Disconnect if connected
    const connected = connectedServers.get(id);
    if (connected) {
      await disconnectServer(id);
    }
    setServers((prev) => prev.filter((server) => server.id !== id));
  }, [connectedServers]);

  // Internal connect function that works with config directly
  const connectServerInternal = useCallback(
    async (serverConfig: MCPServerConfig) => {
      const id = serverConfig.id;

      // Update status to connecting
      setConnectedServers((prev) => {
        const newMap = new Map(prev);
        newMap.set(id, {
          config: serverConfig,
          status: "connecting",
        });
        return newMap;
      });

      try {
        const response = await fetch("/api/mcp/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(serverConfig),
        });

        const result: MCPApiResponse<MCPServerCapabilities> = await response.json();

        if (result.success && result.data) {
          setConnectedServers((prev) => {
            const newMap = new Map(prev);
            newMap.set(id, {
              config: serverConfig,
              status: "connected",
              capabilities: result.data,
            });
            return newMap;
          });
        } else {
          setConnectedServers((prev) => {
            const newMap = new Map(prev);
            newMap.set(id, {
              config: serverConfig,
              status: "error",
              error: result.error || "Failed to connect",
            });
            return newMap;
          });
        }
      } catch (error) {
        setConnectedServers((prev) => {
          const newMap = new Map(prev);
          newMap.set(id, {
            config: serverConfig,
            status: "error",
            error: error instanceof Error ? error.message : "Failed to connect",
          });
          return newMap;
        });
      }
    },
    []
  );

  const connectServer = useCallback(
    async (id: string) => {
      const serverConfig = servers.find((s) => s.id === id);
      if (!serverConfig) {
        throw new Error(`Server ${id} not found`);
      }

      setIsLoading(true);
      try {
        await connectServerInternal(serverConfig);
      } finally {
        setIsLoading(false);
      }
    },
    [servers, connectServerInternal]
  );

  const disconnectServer = useCallback(async (id: string) => {
    setIsLoading(true);

    try {
      await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId: id }),
      });

      setConnectedServers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } catch (error) {
      console.error("Failed to disconnect:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshCapabilities = useCallback(async (id: string) => {
    const connected = connectedServers.get(id);
    if (!connected || connected.status !== "connected") {
      return;
    }

    try {
      const [toolsRes, promptsRes, resourcesRes] = await Promise.all([
        fetch(`/api/mcp/servers/${id}/tools`),
        fetch(`/api/mcp/servers/${id}/prompts`),
        fetch(`/api/mcp/servers/${id}/resources`),
      ]);

      const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
        toolsRes.json(),
        promptsRes.json(),
        resourcesRes.json(),
      ]);

      const capabilities: MCPServerCapabilities = {
        tools: toolsResult.success ? toolsResult.data : [],
        prompts: promptsResult.success ? promptsResult.data : [],
        resources: resourcesResult.success ? resourcesResult.data.resources : [],
        resourceTemplates: resourcesResult.success ? resourcesResult.data.resourceTemplates : [],
      };

      setConnectedServers((prev) => {
        const newMap = new Map(prev);
        const current = newMap.get(id);
        if (current) {
          newMap.set(id, { ...current, capabilities });
        }
        return newMap;
      });
    } catch (error) {
      console.error("Failed to refresh capabilities:", error);
    }
  }, [connectedServers]);

  const getServerStatus = useCallback(
    (id: string): MCPConnectionStatus => {
      const connected = connectedServers.get(id);
      return connected?.status || "disconnected";
    },
    [connectedServers]
  );

  const exportConfig = useCallback((): MCPExportConfig => {
    return {
      version: "1.0.0",
      servers: servers.map(({ name, type, command, args, env, url, headers, autoConnect }) => ({
        name,
        type,
        command,
        args,
        env,
        url,
        headers,
        autoConnect,
      })),
      exportedAt: Date.now(),
    };
  }, [servers]);

  const importConfig = useCallback((config: MCPExportConfig) => {
    const importedServers: MCPServerConfig[] = config.servers.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    setServers((prev) => [...prev, ...importedServers]);
  }, []);

  return (
    <MCPContext.Provider
      value={{
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
      }}
    >
      {children}
    </MCPContext.Provider>
  );
}

export function useMCP() {
  const context = useContext(MCPContext);
  if (!context) {
    throw new Error("useMCP must be used within an MCPProvider");
  }
  return context;
}

