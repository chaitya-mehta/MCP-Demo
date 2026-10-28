import { createServer } from "../src/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

async function verifyServer() {
  console.log("=== Verifying MCP Server Protocol & Tools ===");

  const server = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client(
    { name: "test-verifier-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  console.log("-> Client connected to MCP server successfully via MCP protocol.");

  // 1. Tool discovery
  const toolsResponse = await client.listTools();
  const toolNames = toolsResponse.tools.map((t) => t.name);
  console.log("\n[Step 1: Tool Discovery]");
  console.log("Discovered tools:", toolNames);

  const requiredTools = [
    "getEmployeeDetails",
    "listEmployees",
    "calculateSalaryBreakdown",
    "getProjectDetails"
  ];

  for (const req of requiredTools) {
    if (!toolNames.includes(req)) {
      throw new Error(`Missing required tool in MCP server: ${req}`);
    }
  }
  console.log("-> All 4 required tools are properly registered and exposed via MCP!");

  // 2. Test tool execution: listEmployees
  console.log("\n[Step 2: Testing listEmployees]");
  const listResult = await client.callTool({ name: "listEmployees", arguments: {} });
  const listContent = JSON.parse((listResult.content[0] as { text: string }).text);
  console.log("-> listEmployees count:", listContent.count);
  if (listContent.count < 4) throw new Error("listEmployees returned insufficient items");

  // 3. Test tool execution: getEmployeeDetails (found)
  console.log("\n[Step 3: Testing getEmployeeDetails('101')]");
  const empResult = await client.callTool({
    name: "getEmployeeDetails",
    arguments: { employeeId: "101" }
  });
  const empContent = JSON.parse((empResult.content[0] as { text: string }).text);
  console.log("-> Found employee:", empContent.name, "-", empContent.designation);
  if (empContent.name !== "Alex Rivera") throw new Error("Employee 101 name mismatch");

  // 4. Test tool execution: getEmployeeDetails (not found)
  console.log("\n[Step 4: Testing getEmployeeDetails('999') (Unknown)]");
  const missingEmpResult = await client.callTool({
    name: "getEmployeeDetails",
    arguments: { employeeId: "999" }
  });
  const missingEmpContent = JSON.parse((missingEmpResult.content[0] as { text: string }).text);
  console.log("-> Not found handled gracefully:", missingEmpContent.status, "-", missingEmpContent.message);
  if (missingEmpContent.status !== "not_found") throw new Error("Expected status not_found for ID 999");

  // 5. Test tool execution: calculateSalaryBreakdown
  console.log("\n[Step 5: Testing calculateSalaryBreakdown(50000, 10000)]");
  const salaryResult = await client.callTool({
    name: "calculateSalaryBreakdown",
    arguments: { basicSalary: 50000, allowances: 10000 }
  });
  const salaryContent = JSON.parse((salaryResult.content[0] as { text: string }).text);
  console.log("-> Total gross calculated:", salaryContent.formattedTotal);
  if (salaryContent.grossSalary !== 60000) throw new Error("Salary calculation mismatch");

  // 6. Test tool execution: getProjectDetails
  console.log("\n[Step 6: Testing getProjectDetails('P101')]");
  const projResult = await client.callTool({
    name: "getProjectDetails",
    arguments: { projectId: "P101" }
  });
  const projContent = JSON.parse((projResult.content[0] as { text: string }).text);
  console.log("-> Project found:", projContent.name, "(Status:", projContent.currentStatus + ")");
  if (!projContent.name.includes("Aurora")) throw new Error("Project P101 mismatch");

  // Clean disconnect
  await client.close();
  await server.close();
  console.log("\n=== MCP Server Protocol & Tools Verified Successfully! ===");
}

verifyServer().catch((err) => {
  console.error("Server verification failed:", err);
  process.exit(1);
});
