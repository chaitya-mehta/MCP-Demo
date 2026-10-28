import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";
import { ToolMapper } from "./toolMapper.js";
import { McpClientManager } from "./mcpClient.js";

/**
 * Enterprise LLM Service & AI Agent Orchestration Loop
 *
 * Implements an AI Agent workflow:
 *  1. Accepts user intent in natural language.
 *  2. Evaluates context and determines tool requirements using an LLM.
 *  3. Executes MCP tools dynamically through the MCP Client.
 *  4. Ingests tool outputs back into the conversation context.
 *  5. Synthesizes a final, authoritative, user-friendly response.
 *  6. Bounds execution with a maximum iteration threshold (loop protection).
 */
export class LlmService {
  private openai: OpenAI | null = null;
  private model: string;
  private maxIterations: number = 5;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    this.model = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (key && key.trim() !== "" && !key.includes("your_openai_api_key_here")) {
      this.openai = new OpenAI({ apiKey: key });
    }
  }

  /**
   * Checks whether a live OpenAI API key is configured.
   */
  public hasValidApiKey(): boolean {
    return this.openai !== null;
  }

  /**
   * Main Agent Execution Loop (ReAct / Tool-Use Pattern)
   */
  public async processQuery(
    userQuery: string,
    mcpTools: McpTool[],
    mcpClient: McpClientManager
  ): Promise<{ response: string; iterations: number; toolCallsMade: string[] }> {
    if (!this.hasValidApiKey()) {
      return this.runSimulatedAgent(userQuery, mcpTools, mcpClient);
    }

    const openAiTools = ToolMapper.toOpenAiTools(mcpTools);
    const toolCallsMade: string[] = [];

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are an intelligent enterprise assistant.
You have access to tools via the Model Context Protocol (MCP) to access organizational data.
- Always use the provided tools to fetch real data when needed.
- If an employee or project does not exist, convey the tool's not-found message clearly.
- Provide clear, professional, and helpful responses to the user.
- Calculate salary accurately using the calculateSalaryBreakdown tool.`
      },
      {
        role: "user",
        content: userQuery
      }
    ];

    let currentIteration = 0;

    console.log(`\n=================================================`);
    console.log(`🤖 Starting AI Agent Loop (Model: ${this.model})`);
    console.log(`User Query: "${userQuery}"`);
    console.log(`=================================================`);

    while (currentIteration < this.maxIterations) {
      currentIteration++;
      console.log(`\n[Agent Loop - Step ${currentIteration}/${this.maxIterations}] Calling LLM for reasoning...`);

      const completion = await this.openai!.chat.completions.create({
        model: this.model,
        messages: messages,
        tools: openAiTools.length > 0 ? openAiTools : undefined,
        tool_choice: "auto"
      });

      const choice = completion.choices[0];
      const assistantMessage = choice.message;

      // Append assistant's response to the conversation history
      messages.push(assistantMessage);

      // Check if LLM decided to call any tools
      const toolCalls = assistantMessage.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        console.log(`[Agent Loop] LLM completed reasoning. Generating final answer.`);
        return {
          response: assistantMessage.content || "No response generated.",
          iterations: currentIteration,
          toolCallsMade
        };
      }

      // Execute each tool call requested by the model
      for (const call of toolCalls) {
        const toolName = call.function.name;
        const rawArgs = call.function.arguments;
        toolCallsMade.push(toolName);

        console.log(`\n[Tool Dispatch] LLM requested tool: "${toolName}"`);
        console.log(`[Tool Dispatch] Raw arguments: ${rawArgs}`);

        let toolResultText: string;

        try {
          const parsedArgs = ToolMapper.parseArguments(rawArgs);
          const toolResult = await mcpClient.callTool(toolName, parsedArgs);
          toolResultText = ToolMapper.extractTextContent(toolResult);
        } catch (error) {
          toolResultText = JSON.stringify({
            status: "error",
            message: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
          });
        }

        console.log(`[Tool Result Output]:\n${toolResultText}`);

        // Return the tool result to the conversation context
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: toolResultText
        });
      }
    }

    return {
      response: "Agent loop limit reached without final conclusion.",
      iterations: currentIteration,
      toolCallsMade
    };
  }

  /**
   * Offline / Simulated Agent Mode
   * Demonstrates the exact agentic flow (intent recognition -> MCP tool call -> final answer)
   * when an OpenAI API key has not yet been set by the user.
   */
  public async runSimulatedAgent(
    userQuery: string,
    _mcpTools: McpTool[],
    mcpClient: McpClientManager
  ): Promise<{ response: string; iterations: number; toolCallsMade: string[] }> {
    console.log(`\n[Demo Mode: No OPENAI_API_KEY detected]`);
    console.log(`Operating in deterministic agent demonstration mode.`);
    console.log(`To use live OpenAI GPT models, set your OPENAI_API_KEY in .env`);

    const q = userQuery.toLowerCase();
    const toolCallsMade: string[] = [];

    let toolName = "";
    let toolArgs: Record<string, unknown> = {};

    if (q.includes("list") || q.includes("all employees")) {
      toolName = "listEmployees";
      toolArgs = {};
    } else if (q.includes("salary") || q.includes("calculate")) {
      toolName = "calculateSalaryBreakdown";
      const numbers = userQuery.match(/\d[\d,]*/g)?.map((n) => Number(n.replace(/,/g, ""))) || [];
      const basic = numbers[0] ?? 50000;
      const allowance = numbers[1] ?? 10000;
      toolArgs = { basicSalary: basic, allowances: allowance };
    } else if (q.includes("project") || q.includes("p10")) {
      toolName = "getProjectDetails";
      const match = userQuery.match(/p\d+/i);
      toolArgs = { projectId: match ? match[0].toUpperCase() : "P101" };
    } else if (q.includes("employee") || q.includes("101") || q.includes("102") || q.includes("details")) {
      toolName = "getEmployeeDetails";
      const match = userQuery.match(/\b\d{3}\b/);
      toolArgs = { employeeId: match ? match[0] : "101" };
    } else {
      toolName = "listEmployees";
      toolArgs = {};
    }

    console.log(`\n🤖 [Agent Decision]: User asked "${userQuery}"`);
    console.log(`🤖 [Agent Action]: Selected MCP Tool -> "${toolName}" with args:`, toolArgs);

    toolCallsMade.push(toolName);
    const mcpResult = await mcpClient.callTool(toolName, toolArgs);
    const rawText = ToolMapper.extractTextContent(mcpResult);
    const parsed = JSON.parse(rawText);

    let summaryResponse = "";
    if (toolName === "listEmployees") {
      summaryResponse = `I found ${parsed.count} employees in the company directory:\n` +
        parsed.employees.map((e: any) => `• ${e.name} (ID: ${e.id}) - ${e.designation} (${e.department})`).join("\n");
    } else if (toolName === "getEmployeeDetails") {
      if (parsed.status === "not_found") {
        summaryResponse = `Sorry, ${parsed.message}`;
      } else {
        summaryResponse = `Here are the details for ${parsed.name} (ID: ${parsed.employeeId}):\n` +
          `• Designation: ${parsed.designation}\n` +
          `• Department: ${parsed.department}\n` +
          `• Email: ${parsed.email}\n` +
          `• Start Date: ${parsed.joinDate}`;
      }
    } else if (toolName === "calculateSalaryBreakdown") {
      summaryResponse = `Here is the salary breakdown:\n` +
        `• Base Salary: $${parsed.basicSalary.toLocaleString()}\n` +
        `• Allowances: $${parsed.allowances.toLocaleString()}\n` +
        `• Total Gross Salary: ${parsed.formattedTotal}`;
    } else if (toolName === "getProjectDetails") {
      if (parsed.status === "not_found") {
        summaryResponse = `Sorry, ${parsed.message}`;
      } else {
        summaryResponse = `Project Details for "${parsed.name}" (${parsed.projectId}):\n` +
          `• Status: ${parsed.currentStatus}\n` +
          `• Description: ${parsed.description}\n` +
          `• Tech Stack: ${parsed.techStack.join(", ")}\n` +
          `• Tech Lead Employee ID: ${parsed.leadEmployeeId}`;
      }
    }

    return {
      response: summaryResponse,
      iterations: 1,
      toolCallsMade
    };
  }
}
