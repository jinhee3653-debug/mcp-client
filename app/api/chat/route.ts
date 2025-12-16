import { GoogleGenAI, mcpToTool } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { getMCPClientManager } from "@/lib/mcp/client-manager";

// Node.js runtime required for MCP Stdio transport
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not set in environment variables." },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { messages, useMcpTools } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and must not be empty." },
        { status: 400 }
      );
    }

    // Filter out empty messages
    const validMessages = messages.filter(
      (msg: any) => msg.content && typeof msg.content === "string" && msg.content.trim() !== ""
    );

    if (validMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages found (all empty)." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Prepare tools
    let tools: any[] = [];
    if (useMcpTools) {
      const mcpManager = getMCPClientManager();
      const connectedServerIds = mcpManager.getConnectedServerIds();
      
      for (const serverId of connectedServerIds) {
        const client = mcpManager.getClient(serverId);
        if (client) {
          tools.push(mcpToTool(client));
        }
      }
    }

    const contents = validMessages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const result = await ai.models.generateContentStream({
      model: "gemini-2.5-flash", // Using newer model for better tool calling
      contents: contents,
      config: {
        tools: tools.length > 0 ? tools : undefined,
      },
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        const send = (data: any) => {
          controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
        };

        try {
          for await (const chunk of result) {
            const chunkAny = chunk as any;
            
            // Handle function calls
            let functionCalls;
            if (typeof chunkAny.functionCalls === 'function') {
                functionCalls = chunkAny.functionCalls();
            } else {
                functionCalls = chunkAny.functionCalls;
            }

            if (functionCalls && functionCalls.length > 0) {
              for (const call of functionCalls) {
                send({
                  type: "tool_call",
                  toolCallId: call.name + "-" + Date.now(), // Generate a temp ID
                  name: call.name,
                  args: call.args,
                });
              }
            }
            
            // Handle text
            let text;
            if (typeof chunkAny.text === 'function') {
                try {
                    text = chunkAny.text();
                } catch (e) {
                    // Sometimes text() throws if there's no text but only function calls
                    text = "";
                }
            } else {
                text = chunkAny.text;
            }

            if (text) {
              send({
                type: "text",
                content: text,
              });
            }

            // Note: Since we are using automatic function calling (implied by mcpToTool integration details 
            // from the context, or if the SDK handles it), we might receive functionResponse chunks too.
            // But usually, the visual output "Tool Result" comes from us capturing the result 
            // or the model generating text describing the result.
            // For explicit "result" visualization, we might need to intercept the execution or 
            // rely on the model explaining it.
            // For now, we visualize the "Call" which is the most important part the user is missing.
          }
          controller.close();
        } catch (error: any) {
          console.error("Stream error:", error);
          send({ type: "error", error: error.message });
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (error: any) {
    console.error("Error in chat API:", error);
    
    // Check for rate limit error (429)
    const isRateLimit = 
      error.status === 429 || 
      error.code === 429 || 
      (error.message && error.message.includes("429")) ||
      (error.message && error.message.includes("quota")) ||
      (error.message && error.message.includes("RESOURCE_EXHAUSTED"));

    if (isRateLimit) {
      return NextResponse.json(
        { error: "이용량이 초과되었습니다. 잠시 후 다시 시도해주세요. (429 Too Many Requests)" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || "An error occurred during chat processing." },
      { status: 500 }
    );
  }
}
