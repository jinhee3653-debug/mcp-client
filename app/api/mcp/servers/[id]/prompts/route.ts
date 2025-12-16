import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse, MCPPrompt } from "@/types/mcp";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;

    const manager = getMCPClientManager();
    
    if (!manager.isConnected(serverId)) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Server is not connected" },
        { status: 400 }
      );
    }

    const prompts = await manager.listPrompts(serverId);

    return NextResponse.json<MCPApiResponse<MCPPrompt[]>>({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error("Error listing prompts:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list prompts",
      },
      { status: 500 }
    );
  }
}

