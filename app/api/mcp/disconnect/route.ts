import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse } from "@/types/mcp";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { serverId } = await req.json();

    if (!serverId) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Server ID is required" },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    await manager.disconnect(serverId);

    return NextResponse.json<MCPApiResponse>({
      success: true,
    });
  } catch (error) {
    console.error("Error disconnecting from MCP server:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to disconnect from MCP server",
      },
      { status: 500 }
    );
  }
}

