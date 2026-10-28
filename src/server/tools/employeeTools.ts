import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { EmployeeService } from "../services/employeeService.js";

/**
 * Registers Employee-related MCP tools on the server instance.
 *
 * Tools:
 * 1. getEmployeeDetails - Retrieves details for a specific employee by ID.
 * 2. listEmployees - Lists all employees in the organization.
 */
export function registerEmployeeTools(server: McpServer): void {
  // Tool 1: getEmployeeDetails
  server.tool(
    "getEmployeeDetails",
    "Retrieve profile details (name, designation, department, email) for an employee by their ID.",
    {
      employeeId: z
        .string()
        .min(1, "Employee ID must not be empty")
        .describe("The unique employee ID to search for (e.g. '101', '102')")
    },
    async ({ employeeId }) => {
      console.error(`[MCP Tool Call] getEmployeeDetails requested for employeeId: "${employeeId}"`);

      try {
        const result = await EmployeeService.getEmployeeById(employeeId);

        if (!result.success || !result.data) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    status: "not_found",
                    message: result.message
                  },
                  null,
                  2
                )
              }
            ],
            isError: false // Return as clean structured response for LLM reasoning
          };
        }

        const formatted = {
          status: "success",
          employeeId: result.data.id,
          name: result.data.name,
          designation: result.data.designation,
          department: result.data.department,
          email: result.data.email,
          joinDate: result.data.joinDate,
          summary: `${result.data.name} is a ${result.data.designation} in the ${result.data.department} department.`
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
        console.error(`[MCP Error] Failed to retrieve employee:`, error);
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

  // Tool 2: listEmployees
  server.tool(
    "listEmployees",
    "Retrieve a list of all active employees with their ID, name, designation, and department.",
    async () => {
      console.error("[MCP Tool Call] listEmployees requested");

      try {
        const result = await EmployeeService.getAllEmployees();

        const formatted = {
          status: "success",
          count: result.count,
          employees: result.data.map((emp) => ({
            id: emp.id,
            name: emp.name,
            designation: emp.designation,
            department: emp.department
          }))
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
        console.error(`[MCP Error] Failed to list employees:`, error);
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
