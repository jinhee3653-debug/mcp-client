import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPServerConfig, MCPApiResponse, MCPServerCapabilities } from "@/types/mcp";

// STDIO requires Node.js runtime (not Edge)
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const config: MCPServerConfig = await req.json();

    if (!config.id || !config.name || !config.type) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Missing required fields: id, name, type" },
        { status: 400 }
      );
    }

    if (config.type === "stdio" && !config.command) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Command is required for STDIO transport" },
        { status: 400 }
      );
    }

    if (config.type === "streamable-http" && !config.url) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "URL is required for Streamable HTTP transport" },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    const capabilities = await manager.connect(config);

    return NextResponse.json<MCPApiResponse<MCPServerCapabilities>>({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    console.error("Error connecting to MCP server:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to MCP server",
      },
      { status: 500 }
    );
  }
}

