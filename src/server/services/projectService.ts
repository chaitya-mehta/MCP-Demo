import { MOCK_PROJECTS } from "../data/mockData.js";
import { Project } from "../../shared/schemas.js";

/**
 * Service handling project queries and business logic.
 * Independent of the MCP transport layer.
 */
export class ProjectService {
  /**
   * Retrieves a project by its project ID (e.g. 'P101').
   */
  public static getProjectById(projectId: string): { success: boolean; data?: Project; message: string } {
    if (!projectId || projectId.trim() === "") {
      return {
        success: false,
        message: "Validation Error: Project ID must be a non-empty string."
      };
    }

    const trimmedId = projectId.trim().toLowerCase();
    const project = MOCK_PROJECTS.find(
      (proj) => proj.id.toLowerCase() === trimmedId || `p${proj.id.toLowerCase()}` === trimmedId
    );

    if (!project) {
      return {
        success: false,
        message: `Project not found: No project exists with ID '${projectId}'. Available project IDs: ${MOCK_PROJECTS.map((p) => p.id).join(", ")}.`
      };
    }

    return {
      success: true,
      data: project,
      message: `Project details found for ${project.name} (ID: ${project.id}).`
    };
  }

  /**
   * Lists all projects in the organization.
   */
  public static getAllProjects(): { success: boolean; data: Project[]; count: number; message: string } {
    return {
      success: true,
      data: MOCK_PROJECTS,
      count: MOCK_PROJECTS.length,
      message: `Successfully retrieved ${MOCK_PROJECTS.length} project records.`
    };
  }
}
