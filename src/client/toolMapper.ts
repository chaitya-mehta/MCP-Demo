import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

/**
 * Tool Schema Mapper & Utilities
 *
 * Bridges the gap between the Model Context Protocol (MCP) Tool definitions
 * and OpenAI's Function Calling Schema format.
 */
export class ToolMapper {
  /**
   * Converts a single MCP Tool definition into an OpenAI ChatCompletionTool.
   */
  public static toOpenAiTool(mcpTool: McpTool): ChatCompletionTool {
    const parameters: Record<string, unknown> = {
      type: "object",
      properties: mcpTool.inputSchema?.properties || {},
      required: mcpTool.inputSchema?.required || []
    };

    if (mcpTool.inputSchema?.additionalProperties !== undefined) {
      parameters.additionalProperties = mcpTool.inputSchema.additionalProperties;
    }

    return {
      type: "function",
      function: {
        name: mcpTool.name,
        description: mcpTool.description || `Execute ${mcpTool.name} tool`,
        parameters
      }
    };
  }

  /**
   * Converts an array of MCP Tools to OpenAI ChatCompletionTools.
   */
  public static toOpenAiTools(mcpTools: McpTool[]): ChatCompletionTool[] {
    return mcpTools.map((tool) => this.toOpenAiTool(tool));
  }

  /**
   * Safely parses and validates JSON arguments received from the LLM.
   */
  public static parseArguments(rawArgs: string | undefined): Record<string, unknown> {
    if (!rawArgs || rawArgs.trim() === "") {
      return {};
    }

    try {
      const parsed = JSON.parse(rawArgs);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("Arguments must be a valid JSON object");
      }
      return parsed as Record<string, unknown>;
    } catch (err) {
      throw new Error(`Failed to parse LLM tool arguments JSON: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Safely extracts text representations from an MCP tool call result.
   */
  public static extractTextContent(result: unknown): string {
    if (!result || typeof result !== "object") {
      return "";
    }

    const payload = result as { content?: unknown[] };
    if (!Array.isArray(payload.content)) {
      return JSON.stringify(result);
    }

    return payload.content
      .map((item) => {
        if (typeof item === "object" && item !== null && "text" in item) {
          const textItem = item as { text?: unknown };
          return typeof textItem.text === "string" ? textItem.text : JSON.stringify(item);
        }
        return JSON.stringify(item);
      })
      .join("\n");
  }
}
