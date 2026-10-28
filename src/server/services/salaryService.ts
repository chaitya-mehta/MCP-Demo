import { SalaryBreakdown } from "../../shared/schemas.js";

/**
 * Service handling salary calculations and financial breakdowns.
 * Independent of the MCP transport layer.
 */
export class SalaryService {
  /**
   * Calculates gross salary from basic salary and allowances.
   * Statutory deductions or tax calculations are excluded per specifications.
   */
  public static calculateBreakdown(
    basicSalary: number,
    allowances: number = 0,
    currency: string = "USD"
  ): { success: boolean; data?: SalaryBreakdown; message: string } {
    if (typeof basicSalary !== "number" || isNaN(basicSalary) || basicSalary < 0) {
      return {
        success: false,
        message: "Validation Error: Basic salary must be a non-negative number."
      };
    }

    if (typeof allowances !== "number" || isNaN(allowances) || allowances < 0) {
      return {
        success: false,
        message: "Validation Error: Allowances must be a non-negative number."
      };
    }

    const grossSalary = basicSalary + allowances;
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency
    });

    const breakdown: SalaryBreakdown = {
      basicSalary,
      allowances,
      grossSalary,
      currency,
      formattedTotal: formatter.format(grossSalary)
    };

    return {
      success: true,
      data: breakdown,
      message: `Salary breakdown computed: Basic ${formatter.format(basicSalary)} + Allowances ${formatter.format(
        allowances
      )} = Total Gross ${formatter.format(grossSalary)}.`
    };
  }
}
