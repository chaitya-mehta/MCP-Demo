import { Employee, Project } from "../../shared/schemas.js";

/**
 * Local in-memory mock datasets for demonstration.
 * In a production architecture, this would be replaced with database queries or internal microservices.
 */

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "101",
    name: "Alex Rivera",
    designation: "Senior Full Stack Engineer",
    department: "Engineering",
    email: "alex.rivera@example.com",
    joinDate: "2021-03-15"
  },
  {
    id: "102",
    name: "Priya Sharma",
    designation: "Staff AI Engineer",
    department: "Data & AI",
    email: "priya.sharma@example.com",
    joinDate: "2022-07-01"
  },
  {
    id: "103",
    name: "Marcus Chen",
    designation: "Lead Product Designer",
    department: "Product Design",
    email: "marcus.chen@example.com",
    joinDate: "2020-11-20"
  },
  {
    id: "104",
    name: "Elena Rostova",
    designation: "Engineering Manager",
    department: "Engineering",
    email: "elena.rostova@example.com",
    joinDate: "2019-05-10"
  }
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "P101",
    name: "Project Aurora (AI Knowledge Assistant)",
    description: "Enterprise knowledge assistant utilizing MCP protocol, vector databases, and LLM reasoning.",
    techStack: ["Node.js", "TypeScript", "MCP SDK", "OpenAI API", "PostgreSQL (pgvector)"],
    status: "In Progress",
    leadId: "102"
  },
  {
    id: "P102",
    name: "Cloud Platform Modernization",
    description: "Migrating legacy monolithic workloads to Kubernetes microservices with zero-trust networking.",
    techStack: ["Go", "Kubernetes", "Terraform", "AWS", "gRPC"],
    status: "Completed",
    leadId: "101"
  },
  {
    id: "P103",
    name: "Customer Experience Portal 2.0",
    description: "Revamped customer self-service dashboard with real-time telemetry and accessibility compliance.",
    techStack: ["React", "TypeScript", "Tailwind CSS", "GraphQL", "Fastify"],
    status: "Planning",
    leadId: "103"
  }
];
