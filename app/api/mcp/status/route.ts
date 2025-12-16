import { NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse } from "@/types/mcp";

export const runtime = "nodejs";

export async function GET() {
  try {
    const manager = getMCPClientManager();
    const connectedServerIds = manager.getConnectedServerIds();

    return NextResponse.json<MCPApiResponse<string[]>>({
      success: true,
      data: connectedServerIds,
    });
  } catch (error) {
    console.error("Error getting MCP status:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get MCP status",
      },
      { status: 500 }
    );
  }
}

