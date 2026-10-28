import { EmployeeService } from "../src/server/services/employeeService.js";
import { ProjectService } from "../src/server/services/projectService.js";
import { SalaryService } from "../src/server/services/salaryService.js";
import { closePool } from "../src/server/db/index.js";

async function verifyServices() {
  console.log("=== Verifying PostgreSQL-Backed Domain Services ===");

  try {
    // 1. EmployeeService tests
    console.log("\n[Test 1] EmployeeService.getEmployeeById('101'):");
    const emp = await EmployeeService.getEmployeeById("101");
    console.log("-> Result:", emp.success, emp.data?.name, "-", emp.message);
    if (!emp.success || emp.data?.name !== "Alex Rivera") throw new Error("Employee 101 lookup failed");

    console.log("\n[Test 2] EmployeeService.getEmployeeById('999') (Unknown):");
    const empMissing = await EmployeeService.getEmployeeById("999");
    console.log("-> Result:", empMissing.success, "-", empMissing.message);
    if (empMissing.success) throw new Error("Expected failure for employee 999");

    console.log("\n[Test 3] EmployeeService.getAllEmployees():");
    const allEmp = await EmployeeService.getAllEmployees();
    console.log("-> Count:", allEmp.count, "records found in PostgreSQL.");
    if (allEmp.count < 4) throw new Error("Employee count mismatch");

    // 2. ProjectService tests
    console.log("\n[Test 4] ProjectService.getProjectById('P101'):");
    const proj = await ProjectService.getProjectById("P101");
    console.log("-> Result:", proj.success, proj.data?.name, "-", proj.message);
    if (!proj.success || !proj.data?.name.includes("Aurora")) throw new Error("Project P101 lookup failed");

    console.log("\n[Test 5] ProjectService.getProjectById('P999') (Unknown):");
    const projMissing = await ProjectService.getProjectById("P999");
    console.log("-> Result:", projMissing.success, "-", projMissing.message);
    if (projMissing.success) throw new Error("Expected failure for project P999");

    // 3. SalaryService tests
    console.log("\n[Test 6] SalaryService.calculateBreakdown(50000, 10000):");
    const salary = SalaryService.calculateBreakdown(50000, 10000);
    console.log("-> Result:", salary.success, salary.data?.formattedTotal, "-", salary.message);
    if (!salary.success || salary.data?.grossSalary !== 60000) throw new Error("Salary calculation failed");

    console.log("\n[Test 7] SalaryService.calculateBreakdown(-500, 100) (Invalid input):");
    const salaryInvalid = SalaryService.calculateBreakdown(-500, 100);
    console.log("-> Result:", salaryInvalid.success, "-", salaryInvalid.message);
    if (salaryInvalid.success) throw new Error("Expected failure for negative salary");

    console.log("\nAll PostgreSQL Domain Services verified successfully!");
  } finally {
    await closePool();
  }
}

verifyServices().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
