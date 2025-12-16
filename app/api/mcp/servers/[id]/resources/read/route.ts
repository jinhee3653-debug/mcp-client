import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse, MCPResourceReadResult } from "@/types/mcp";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serverId } = await params;
    const { uri } = await req.json();

    if (!uri) {
      return NextResponse.json<MCPApiResponse>(
        { success: false, error: "Resource URI is required" },
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

    const result = await manager.readResource(serverId, uri);

    return NextResponse.json<MCPApiResponse<MCPResourceReadResult>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error reading resource:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to read resource",
      },
      { status: 500 }
    );
  }
}

