import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse, MCPToolExecuteResult } from "@/types/mcp";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const { toolName, arguments: args } = await req.json();

    if (!toolName) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Tool name is required" },
        { status: 400 }
      );
    }

    const manager = getMCPClientManager();
    
    if (!manager.isConnected(serverId)) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Server is not connected" },
        { status: 400 }
      );
    }

    const result = await manager.executeTool(serverId, toolName, args);

    return NextResponse.json<MCPApiResponse<MCPToolExecuteResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error executing tool:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to execute tool",
      },
      { status: 500 }
    );
  }
}

