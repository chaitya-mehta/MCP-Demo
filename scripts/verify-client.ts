import { McpClientManager } from "../src/client/mcpClient.js";

async function verifyClient() {
  console.log("=== Verifying MCP Client over Stdio Subprocess Transport ===");

  const manager = new McpClientManager();

  try {
    // 1. Connect
    await manager.connect();

    // 2. Discover tools
    const tools = await manager.discoverTools();
    console.log(`\nDiscovered ${tools.length} tools via MCP protocol:`);
    for (const tool of tools) {
      console.log(`- ${tool.name}: ${tool.description}`);
    }

    if (tools.length < 4) {
      throw new Error(`Expected at least 4 tools, got ${tools.length}`);
    }

    // 3. Call tool over stdio
    console.log("\nTesting direct tool call over stdio transport:");
    const result = await manager.callTool("getEmployeeDetails", { employeeId: "102" });
    console.log("Raw tool response content:", result.content);

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    console.log("Parsed result:", parsed);

    if (parsed.name !== "Priya Sharma") {
      throw new Error("Expected Priya Sharma for employee 102");
    }

    console.log("\n=== MCP Client Verification Succeeded! ===");
  } finally {
    // 4. Disconnect cleanly
    await manager.disconnect();
  }
}

verifyClient().catch((err) => {
  console.error("MCP Client verification failed:", err);
  process.exit(1);
});
