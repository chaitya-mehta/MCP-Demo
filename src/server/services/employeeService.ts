import { getEmployeeRepository } from "../db/index.js";
import { Employee } from "../../shared/schemas.js";

/**
 * Service handling employee queries and business logic backed by TypeORM.
 * Uses TypeORM Repository find() methods instead of raw SQL queries.
 */
export class EmployeeService {
  /**
   * Retrieves an employee by their ID from PostgreSQL using TypeORM.
   * Case-insensitive search on the ID.
   */
  public static async getEmployeeById(
    employeeId: string
  ): Promise<{ success: boolean; data?: Employee; message: string }> {
    if (!employeeId || employeeId.trim() === "") {
      return {
        success: false,
        message: "Validation Error: Employee ID must be a non-empty string."
      };
    }

    const trimmedId = employeeId.trim().toLowerCase();
    const allEmployeesResult = await this.getAllEmployees();

    if (!allEmployeesResult.success) {
      return {
        success: false,
        message: allEmployeesResult.message
      };
    }

    const employees = allEmployeesResult.data;
    const employee = employees.find(
      (emp) => emp.id.toLowerCase() === trimmedId || `emp${emp.id.toLowerCase()}` === trimmedId
    );

    if (!employee) {
      return {
        success: false,
        message: `Employee not found: No employee exists with ID '${employeeId}'. Available IDs: ${employees.map((e) => e.id).join(", ")}.`
      };
    }

    return {
      success: true,
      data: employee,
      message: `Employee details found for ${employee.name} (ID: ${employee.id}).`
    };
  }

  /**
   * Lists all employees in the directory using TypeORM repository.find().
   */
  public static async getAllEmployees(): Promise<{
    success: boolean;
    data: Employee[];
    count: number;
    message: string;
  }> {
    try {
      const repo = await getEmployeeRepository();
      const entities = await repo.find({
        order: {
          id: "ASC"
        }
      });

      const employees: Employee[] = entities.map((emp) => ({
        id: emp.id,
        name: emp.name,
        designation: emp.designation,
        department: emp.department,
        email: emp.email,
        joinDate: String(emp.joinDate)
      }));

      return {
        success: true,
        data: employees,
        count: employees.length,
        message: `Successfully retrieved ${employees.length} employee records from PostgreSQL.`
      };
    } catch (err) {
      console.error(`[EmployeeService.getAllEmployees Error]:`, err);
      return {
        success: false,
        data: [],
        count: 0,
        message: `Database Error: Failed to list employees: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}
