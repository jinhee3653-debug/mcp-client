import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
  MCPServerConfig,
  MCPServerCapabilities,
  MCPTool,
  MCPPrompt,
  MCPResource,
  MCPResourceTemplate,
  MCPToolExecuteResult,
  MCPPromptGetResult,
  MCPResourceReadResult,
} from "@/types/mcp";

interface ConnectedClient {
  client: Client;
  transport: StdioClientTransport | StreamableHTTPClientTransport;
  config: MCPServerConfig;
}

/**
 * MCP Client Manager - Singleton
 * Manages MCP client connections to multiple servers
 */
class MCPClientManager {
  private static instance: MCPClientManager;
  private clients: Map<string, ConnectedClient> = new Map();

  private constructor() {}

  public static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      // Use global object to maintain singleton across HMR/reloads in dev
      const globalWithManager = global as typeof global & {
        __MCP_CLIENT_MANAGER_INSTANCE?: MCPClientManager;
      };

      if (!globalWithManager.__MCP_CLIENT_MANAGER_INSTANCE) {
        globalWithManager.__MCP_CLIENT_MANAGER_INSTANCE = new MCPClientManager();
      }
      MCPClientManager.instance = globalWithManager.__MCP_CLIENT_MANAGER_INSTANCE;
    }
    return MCPClientManager.instance;
  }

  /**
   * Get the raw MCP Client instance by server ID
   */
  getClient(serverId: string): Client | undefined {
    return this.clients.get(serverId)?.client;
  }

  /**
   * Connect to an MCP server
   */
  async connect(config: MCPServerConfig): Promise<MCPServerCapabilities> {
    // Disconnect if already connected
    if (this.clients.has(config.id)) {
      await this.disconnect(config.id);
    }

    let transport: StdioClientTransport | StreamableHTTPClientTransport;

    if (config.type === "stdio") {
      if (!config.command) {
        throw new Error("Command is required for STDIO transport");
      }
      transport = new StdioClientTransport({
        command: config.command,
        args: config.args || [],
        env: config.env,
      });
    } else if (config.type === "streamable-http") {
      if (!config.url) {
        throw new Error("URL is required for Streamable HTTP transport");
      }
      transport = new StreamableHTTPClientTransport(new URL(config.url), {
        requestInit: {
          headers: config.headers,
        },
      });
    } else {
      throw new Error(`Unsupported transport type: ${config.type}`);
    }

    const client = new Client(
      {
        name: "mcp-client-app",
        version: "1.0.0",
      },
      {}
    );

    await client.connect(transport);

    this.clients.set(config.id, { client, transport, config });

    // Fetch capabilities
    return await this.getCapabilities(config.id);
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverId: string): Promise<void> {
    const connectedClient = this.clients.get(serverId);
    if (!connectedClient) {
      return;
    }

    try {
      await connectedClient.client.close();
    } catch (error) {
      console.error(`Error closing client for server ${serverId}:`, error);
    }

    this.clients.delete(serverId);
  }

  /**
   * Check if a server is connected
   */
  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Get capabilities (tools, prompts, resources) of a connected server
   */
  async getCapabilities(serverId: string): Promise<MCPServerCapabilities> {
    const connectedClient = this.clients.get(serverId);
    if (!connectedClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const [toolsResult, promptsResult, resourcesResult] = await Promise.all([
      connectedClient.client.listTools().catch(() => ({ tools: [] })),
      connectedClient.client.listPrompts().catch(() => ({ prompts: [] })),
      connectedClient.client.listResources().catch(() => ({ resources: [], resourceTemplates: [] })),
    ]);

    const tools: MCPTool[] = (toolsResult.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown> | undefined,
    }));

    const prompts: MCPPrompt[] = (promptsResult.prompts || []).map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments?.map((a) => ({
        name: a.name,
        description: a.description,
        required: a.required,
      })),
    }));

    const resources: MCPResource[] = (resourcesResult.resources || []).map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    }));

    const resourceTemplates: MCPResourceTemplate[] = (
      Array.isArray(resourcesResult.resourceTemplates) ? resourcesResult.resourceTemplates : []
    ).map((rt) => ({
      uriTemplate: rt.uriTemplate,
      name: rt.name,
      description: rt.description,
      mimeType: rt.mimeType,
    }));

    return { tools, prompts, resources, resourceTemplates };
  }

  /**
   * List tools of a connected server
   */
  async listTools(serverId: string): Promise<MCPTool[]> {
    const capabilities = await this.getCapabilities(serverId);
    return capabilities.tools;
  }

  /**
   * List prompts of a connected server
   */
  async listPrompts(serverId: string): Promise<MCPPrompt[]> {
    const capabilities = await this.getCapabilities(serverId);
    return capabilities.prompts;
  }

  /**
   * List resources of a connected server
   */
  async listResources(
    serverId: string
  ): Promise<{ resources: MCPResource[]; resourceTemplates: MCPResourceTemplate[] }> {
    const capabilities = await this.getCapabilities(serverId);
    return {
      resources: capabilities.resources,
      resourceTemplates: capabilities.resourceTemplates,
    };
  }

  /**
   * Execute a tool
   */
  async executeTool(
    serverId: string,
    toolName: string,
    args?: Record<string, unknown>
  ): Promise<MCPToolExecuteResult> {
    const connectedClient = this.clients.get(serverId);
    if (!connectedClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await connectedClient.client.callTool({
      name: toolName,
      arguments: args,
    });

    return {
      content: (Array.isArray(result.content) ? result.content : []).map((c) => ({
        type: c.type,
        text: c.type === "text" ? (c as { text: string }).text : undefined,
        data: c.type === "image" ? (c as { data: string }).data : undefined,
        mimeType: c.type === "image" ? (c as { mimeType: string }).mimeType : undefined,
      })),
      isError: result.isError as boolean | undefined,
    };
  }

  /**
   * Get a prompt
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<MCPPromptGetResult> {
    const connectedClient = this.clients.get(serverId);
    if (!connectedClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await connectedClient.client.getPrompt({
      name: promptName,
      arguments: args,
    });

    return {
      description: result.description,
      messages: (result.messages || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: {
          type: m.content.type,
          text: m.content.type === "text" ? (m.content as { text: string }).text : undefined,
        },
      })),
    };
  }

  /**
   * Read a resource
   */
  async readResource(serverId: string, uri: string): Promise<MCPResourceReadResult> {
    const connectedClient = this.clients.get(serverId);
    if (!connectedClient) {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const result = await connectedClient.client.readResource({ uri });

    return {
      contents: (result.contents || []).map((c) => ({
        uri: c.uri,
        mimeType: c.mimeType,
        text: "text" in c ? c.text : undefined,
        blob: "blob" in c ? c.blob : undefined,
      })),
    };
  }

  /**
   * Get all connected server IDs
   */
  getConnectedServerIds(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Disconnect all servers
   */
  async disconnectAll(): Promise<void> {
    const serverIds = this.getConnectedServerIds();
    await Promise.all(serverIds.map((id) => this.disconnect(id)));
  }
}

// Export singleton getter
export function getMCPClientManager(): MCPClientManager {
  return MCPClientManager.getInstance();
}

