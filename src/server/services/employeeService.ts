import { MOCK_EMPLOYEES } from "../data/mockData.js";
import { Employee } from "../../shared/schemas.js";

/**
 * Service handling employee queries and business logic.
 * Independent of the MCP transport layer.
 */
export class EmployeeService {
  /**
   * Retrieves an employee by their ID.
   * Case-insensitive search on the ID.
   */
  public static getEmployeeById(employeeId: string): { success: boolean; data?: Employee; message: string } {
    if (!employeeId || employeeId.trim() === "") {
      return {
        success: false,
        message: "Validation Error: Employee ID must be a non-empty string."
      };
    }

    const trimmedId = employeeId.trim().toLowerCase();
    const employee = MOCK_EMPLOYEES.find(
      (emp) => emp.id.toLowerCase() === trimmedId || `emp${emp.id.toLowerCase()}` === trimmedId
    );

    if (!employee) {
      return {
        success: false,
        message: `Employee not found: No employee exists with ID '${employeeId}'. Available IDs: ${MOCK_EMPLOYEES.map((e) => e.id).join(", ")}.`
      };
    }

    return {
      success: true,
      data: employee,
      message: `Employee details found for ${employee.name} (ID: ${employee.id}).`
    };
  }

  /**
   * Lists all employees in the directory.
   */
  public static getAllEmployees(): { success: boolean; data: Employee[]; count: number; message: string } {
    return {
      success: true,
      data: MOCK_EMPLOYEES,
      count: MOCK_EMPLOYEES.length,
      message: `Successfully retrieved ${MOCK_EMPLOYEES.length} employee records.`
    };
  }
}
