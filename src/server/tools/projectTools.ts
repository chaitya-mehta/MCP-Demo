import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectService } from "../services/projectService.js";

/**
 * Registers Project-related MCP tools on the server instance.
 *
 * Tools:
 * 1. getProjectDetails - Retrieves details of a specific project by project ID.
 */
export function registerProjectTools(server: McpServer): void {
  server.tool(
    "getProjectDetails",
    "Retrieve project information, technology stack, and current status by project ID (e.g. 'P101').",
    {
      projectId: z
        .string()
        .min(1, "Project ID must not be empty")
        .describe("The unique project ID to search for (e.g. 'P101', 'P102')")
    },
    async ({ projectId }) => {
      console.error(`[MCP Tool Call] getProjectDetails requested for projectId: "${projectId}"`);

      try {
        const result = ProjectService.getProjectById(projectId);

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
            isError: false
          };
        }

        const project = result.data;
        const formatted = {
          status: "success",
          projectId: project.id,
          name: project.name,
          description: project.description,
          techStack: project.techStack,
          currentStatus: project.status,
          leadEmployeeId: project.leadId,
          summary: `Project '${project.name}' (${project.id}) is currently ${project.status}. Tech Stack: ${project.techStack.join(", ")}.`
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
        console.error(`[MCP Error] Failed to retrieve project:`, error);
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
