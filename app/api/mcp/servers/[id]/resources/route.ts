import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";
import type { MCPApiResponse, MCPResource, MCPResourceTemplate } from "@/types/mcp";

export const runtime = "nodejs";

interface ResourcesResponse {
  resources: MCPResource[];
  resourceTemplates: MCPResourceTemplate[];
}

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

    const result = await manager.listResources(serverId);

    return NextResponse.json<MCPApiResponse<ResourcesResponse>>({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error listing resources:", error);
    return NextResponse.json<MCPApiResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list resources",
      },
      { status: 500 }
    );
  }
}

