import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse, MCPPromptGetResult } from "@/types/mcp";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const { promptName, arguments: args } = await req.json();

    if (!promptName) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Prompt name is required" },
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

    const result = await manager.getPrompt(serverId, promptName, args);

    return NextResponse.json<MCPApiResponse<MCPPromptGetResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error getting prompt:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get prompt",
      },
      { status: 500 }
    );
  }
}

