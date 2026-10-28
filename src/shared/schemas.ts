import { z } from "zod";

/**
 * Shared Domain Entities and Validation Schemas
 * Used across the MCP Server and MCP Client to ensure contract consistency.
 */

// --- Entity Schemas & Types ---

export const EmployeeSchema = z.object({
  id: z.string().describe("Unique employee identifier"),
  name: z.string().describe("Full name of the employee"),
  designation: z.string().describe("Job title or role"),
  department: z.string().describe("Department the employee belongs to"),
  email: z.string().email().describe("Corporate email address"),
  joinDate: z.string().describe("Date of joining (YYYY-MM-DD)")
});

export type Employee = z.infer<typeof EmployeeSchema>;

export const ProjectSchema = z.object({
  id: z.string().describe("Unique project identifier"),
  name: z.string().describe("Name of the project"),
  description: z.string().describe("Brief summary of the project"),
  techStack: z.array(z.string()).describe("List of technologies used"),
  status: z.enum(["Planning", "In Progress", "Completed", "On Hold"]).describe("Current lifecycle status"),
  leadId: z.string().describe("Employee ID of the project tech lead")
});

export type Project = z.infer<typeof ProjectSchema>;

export const SalaryBreakdownSchema = z.object({
  basicSalary: z.number().describe("Base salary amount"),
  allowances: z.number().describe("Total applicable allowances (housing, travel, etc.)"),
  grossSalary: z.number().describe("Gross total salary (basic + allowances)"),
  currency: z.string().default("USD").describe("Currency denomination"),
  formattedTotal: z.string().describe("Human-readable formatted total")
});

export type SalaryBreakdown = z.infer<typeof SalaryBreakdownSchema>;

// --- Tool Input Schemas ---

export const GetEmployeeInputSchema = z.object({
  employeeId: z
    .string()
    .min(1, "Employee ID must not be empty")
    .describe("The unique identifier of the employee, e.g. '101' or 'EMP101'")
});

export type GetEmployeeInput = z.infer<typeof GetEmployeeInputSchema>;

export const ListEmployeesInputSchema = z.object({});

export type ListEmployeesInput = z.infer<typeof ListEmployeesInputSchema>;

export const CalculateSalaryInputSchema = z.object({
  basicSalary: z
    .number()
    .nonnegative("Basic salary must be zero or a positive number")
    .describe("Base salary amount, e.g. 50000"),
  allowances: z
    .number()
    .nonnegative("Allowances must be zero or a positive number")
    .default(0)
    .describe("Applicable allowances, e.g. 10000")
});

export type CalculateSalaryInput = z.infer<typeof CalculateSalaryInputSchema>;

export const GetProjectInputSchema = z.object({
  projectId: z
    .string()
    .min(1, "Project ID must not be empty")
    .describe("The unique identifier of the project, e.g. 'P101'")
});

export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;
