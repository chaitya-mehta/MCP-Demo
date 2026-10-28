import dotenv from "dotenv";
dotenv.config();

import { McpClientManager } from "./mcpClient.js";
import { LlmService } from "./llmService.js";
import { ToolMapper } from "./toolMapper.js";

/**
 * Enterprise MCP Client Application
 *
 * Demonstrates:
 * 1. MCP Server process lifecycle and Stdio transport connection.
 * 2. Dynamic discovery of MCP Tools over the protocol.
 * 3. AI Agent Tool-Calling Loop with OpenAI (or offline simulation).
 * 4. Human-readable synthesis of tool outputs.
 */

const DEMO_QUESTIONS = [
  "Find employee details for employee ID 101.",
  "List all employees.",
  "Calculate the total salary for a basic salary of 50,000 and allowances of 10,000.",
  "Show me the details of project P101.",
  "Can you look up employee 999?"
];

async function runDirectMcpDemo(mcpManager: McpClientManager) {
  console.log("\n=======================================================");
  console.log("   Mode: DIRECT MCP PROTOCOL INVOCATION (No LLM)      ");
  console.log("=======================================================");

  // 1. List employees
  const listRes = await mcpManager.callTool("listEmployees", {});
  console.log("[Direct Result]:", ToolMapper.extractTextContent(listRes));

  // 2. Employee details
  const empRes = await mcpManager.callTool("getEmployeeDetails", { employeeId: "101" });
  console.log("[Direct Result]:", ToolMapper.extractTextContent(empRes));

  // 3. Salary calculation
  const salaryRes = await mcpManager.callTool("calculateSalaryBreakdown", {
    basicSalary: 50000,
    allowances: 10000
  });
  console.log("[Direct Result]:", ToolMapper.extractTextContent(salaryRes));

  // 4. Project details
  const projRes = await mcpManager.callTool("getProjectDetails", { projectId: "P101" });
  console.log("[Direct Result]:", ToolMapper.extractTextContent(projRes));
}

async function runAgentDemo(
  mcpManager: McpClientManager,
  llmService: LlmService,
  questions: string[]
) {
  console.log("\n=======================================================");
  console.log("   Mode: AI AGENT WORKFLOW (LLM + MCP Protocol)        ");
  console.log("=======================================================");

  // Discover available tools from the MCP server
  const tools = await mcpManager.discoverTools();
  console.log(`\nDiscovered ${tools.length} available tools from MCP Server:`);
  tools.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.name}: ${t.description}`);
  });

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n-------------------------------------------------------`);
    console.log(`Demo Scenario ${i + 1}/${questions.length}`);
    console.log(`User Question: "${question}"`);
    console.log(`-------------------------------------------------------`);

    const startTime = Date.now();
    const result = await llmService.processQuery(question, tools, mcpManager);
    const durationMs = Date.now() - startTime;

    console.log(`\n💬 [Final Assistant Response]:`);
    console.log(result.response);
    console.log(`\n[Execution Metrics]: Loops: ${result.iterations} | Tools: [${result.toolCallsMade.join(", ")}] | Latency: ${durationMs}ms`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDirectMode = args.includes("--direct");
  const customQuery = args.find((a) => !a.startsWith("--"));

  const mcpManager = new McpClientManager();
  const llmService = new LlmService();

  console.log("=======================================================");
  console.log("   MCP Client & AI Agent Demonstration Runner          ");
  console.log("=======================================================");
  console.log(`OpenAI Integration: ${llmService.hasValidApiKey() ? "Enabled (Live API)" : "Simulated Agent Mode (Set OPENAI_API_KEY in .env for live GPT)"}`);

  try {
    await mcpManager.connect();

    if (isDirectMode) {
      await runDirectMcpDemo(mcpManager);
    } else if (customQuery) {
      const tools = await mcpManager.discoverTools();
      const result = await llmService.processQuery(customQuery, tools, mcpManager);
      console.log(`\n💬 [Final Response]:\n${result.response}`);
    } else {
      await runAgentDemo(mcpManager, llmService, DEMO_QUESTIONS);
    }
  } catch (error) {
    console.error("\n[Application Error]:", error);
    process.exitCode = 1;
  } finally {
    await mcpManager.disconnect();
    console.log("\n[Demo Finished] Session ended cleanly.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
