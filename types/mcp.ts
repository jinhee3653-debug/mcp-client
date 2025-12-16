// MCP Server Transport Types
export type MCPTransportType = "stdio" | "streamable-http";

// MCP Server Configuration
export interface MCPServerConfig {
  id: string;
  name: string;
  type: MCPTransportType;
  // For STDIO transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  // For Streamable HTTP transport
  url?: string;
  headers?: Record<string, string>;
  // Auto-connect on page load
  autoConnect?: boolean;
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// Connection status
export type MCPConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// MCP Tool
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

// MCP Prompt
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}

// MCP Resource
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// MCP Resource Template
export interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description?: string;
  mimeType?: string;
}

// Server capabilities info
export interface MCPServerCapabilities {
  tools: MCPTool[];
  prompts: MCPPrompt[];
  resources: MCPResource[];
  resourceTemplates: MCPResourceTemplate[];
}

// Connected server state
export interface MCPConnectedServer {
  config: MCPServerConfig;
  status: MCPConnectionStatus;
  error?: string;
  capabilities?: MCPServerCapabilities;
}

// Tool execution request
export interface MCPToolExecuteRequest {
  serverId: string;
  toolName: string;
  arguments?: Record<string, unknown>;
}

// Tool execution result
export interface MCPToolExecuteResult {
  content: Array<{
    type: string;
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// Prompt get request
export interface MCPPromptGetRequest {
  serverId: string;
  promptName: string;
  arguments?: Record<string, string>;
}

// Prompt get result
export interface MCPPromptGetResult {
  description?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: {
      type: string;
      text?: string;
    };
  }>;
}

// Resource read request
export interface MCPResourceReadRequest {
  serverId: string;
  uri: string;
}

// Resource read result
export interface MCPResourceReadResult {
  contents: Array<{
    uri: string;
    mimeType?: string;
    text?: string;
    blob?: string;
  }>;
}

// Export/Import config format
export interface MCPExportConfig {
  version: string;
  servers: Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">[];
  exportedAt: number;
}

// Server config without metadata (for form submission and export)
export type MCPServerConfigInput = Omit<MCPServerConfig, "id" | "createdAt" | "updatedAt">;

// API Response types
export interface MCPApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

