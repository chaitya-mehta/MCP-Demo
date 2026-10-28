import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SalaryService } from "../services/salaryService.js";

/**
 * Registers Salary-related MCP tools on the server instance.
 *
 * Tools:
 * 1. calculateSalaryBreakdown - Calculates total gross salary from basic salary and allowances.
 */
export function registerSalaryTools(server: McpServer): void {
  server.tool(
    "calculateSalaryBreakdown",
    "Calculate the total salary breakdown given the basic salary amount and optional allowances. Does not apply statutory taxes.",
    {
      basicSalary: z
        .number()
        .nonnegative("Basic salary must be 0 or greater")
        .describe("The employee's basic salary amount (e.g. 50000)"),
      allowances: z
        .number()
        .nonnegative("Allowances must be 0 or greater")
        .default(0)
        .describe("Total applicable allowances such as housing, medical, or transport (default: 0)")
    },
    async ({ basicSalary, allowances }) => {
      console.error(
        `[MCP Tool Call] calculateSalaryBreakdown requested for basicSalary: ${basicSalary}, allowances: ${allowances}`
      );

      try {
        const result = SalaryService.calculateBreakdown(basicSalary, allowances);

        if (!result.success || !result.data) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "calculation_error",
                    message: result.message
                  },
                  null,
                  2
                )
              }
            ],
            isError: true
          };
        }

        const data = result.data;
        const formatted = {
          status: "success",
          basicSalary: data.basicSalary,
          allowances: data.allowances,
          grossSalary: data.grossSalary,
          currency: data.currency,
          formattedTotal: data.formattedTotal,
          summary: result.message
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`[MCP Error] Failed to calculate salary breakdown:`, error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "error",
                message: error instanceof Error ? error.message : "Internal error occurred"
              })
            }
          ],
          isError: true
        };
      }
    }
  );
}
