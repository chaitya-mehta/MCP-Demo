import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEmployeeTools } from "./tools/employeeTools.js";
import { registerProjectTools } from "./tools/projectTools.js";
import { registerSalaryTools } from "./tools/salaryTools.js";

/**
 * Enterprise MCP Server Entrypoint
 *
 * Implements Model Context Protocol (MCP) over StdioServerTransport.
 * Exposes 4 tools:
 *  - getEmployeeDetails
 *  - listEmployees
 *  - calculateSalaryBreakdown
 *  - getProjectDetails
 *
 * NOTE ON LOGGING:
 * Because stdio transport uses process.stdout exclusively for framing JSON-RPC packets,
 * all human-readable diagnostic messages MUST be directed to process.stderr (e.g. console.error).
 */

export function createServer(): McpServer {
  const server = new McpServer({
    name: "enterprise-directory-mcp-server",
    version: "1.0.0"
  });

  // Register domain tools
  registerEmployeeTools(server);
  registerProjectTools(server);
  registerSalaryTools(server);

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  console.error("=================================================");
  console.error("   Enterprise MCP Server (Node.js / TypeScript)  ");
  console.error("=================================================");
  console.error("Protocol: Model Context Protocol (MCP)");
  console.error("Transport: stdio (Standard Input / Output)");
  console.error("Status: Initializing server and connecting transport...");

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    console.error(`\n[MCP Server] Received ${signal}. Closing server transport cleanly...`);
    try {
      await server.close();
      console.error("[MCP Server] Shutdown complete.");
      process.exit(0);
    } catch (err) {
      console.error("[MCP Server] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  // Connect to stdio transport
  await server.connect(transport);
  console.error("[MCP Server] Connected to stdio transport successfully.");
  console.error("[MCP Server] Listening for JSON-RPC messages from MCP client or MCP Inspector.");
}

// Auto-start when executed directly
if (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js")) {
  startServer().catch((error) => {
    console.error("[MCP Server Fatal Error] Server failed to start:", error);
    process.exit(1);
  });
}
