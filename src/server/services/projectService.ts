import { getProjectRepository } from "../db/index.js";
import { Project } from "../../shared/schemas.js";

/**
 * Service handling project queries and business logic backed by TypeORM.
 * Uses TypeORM Repository find() methods instead of raw SQL queries.
 */
export class ProjectService {
  /**
   * Retrieves a project by its project ID (e.g. 'P101') using TypeORM.
   */
  public static async getProjectById(
    projectId: string
  ): Promise<{ success: boolean; data?: Project; message: string }> {
    if (!projectId || projectId.trim() === "") {
      return {
        success: false,
        message: "Validation Error: Project ID must be a non-empty string."
      };
    }

    const trimmedId = projectId.trim().toLowerCase();
    const allProjectsResult = await this.getAllProjects();

    if (!allProjectsResult.success) {
      return {
        success: false,
        message: allProjectsResult.message
      };
    }

    const projects = allProjectsResult.data;
    const project = projects.find(
      (proj) => proj.id.toLowerCase() === trimmedId || `p${proj.id.toLowerCase()}` === trimmedId
    );

    if (!project) {
      return {
        success: false,
        message: `Project not found: No project exists with ID '${projectId}'. Available project IDs: ${projects.map((p) => p.id).join(", ")}.`
      };
    }

    return {
      success: true,
      data: project,
      message: `Project details found for ${project.name} (ID: ${project.id}).`
    };
  }

  /**
   * Lists all projects in the organization using TypeORM repository.find().
   */
  public static async getAllProjects(): Promise<{
    success: boolean;
    data: Project[];
    count: number;
    message: string;
  }> {
    try {
      const repo = await getProjectRepository();
      const entities = await repo.find({
        order: {
          id: "ASC"
        }
      });

      const projects: Project[] = entities.map((proj) => ({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        techStack: proj.techStack || [],
        status: proj.status,
        leadId: proj.leadId || ""
      }));

      return {
        success: true,
        data: projects,
        count: projects.length,
        message: `Successfully retrieved ${projects.length} project records from PostgreSQL.`
      };
    } catch (err) {
      console.error(`[ProjectService.getAllProjects Error]:`, err);
      return {
        success: false,
        data: [],
        count: 0,
        message: `Database Error: Failed to list projects: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}
