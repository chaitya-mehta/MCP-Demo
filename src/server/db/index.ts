import "reflect-metadata";
import { DataSource, Repository } from "typeorm";
import dotenv from "dotenv";
import { EmployeeEntity } from "./entities/EmployeeEntity.js";
import { ProjectEntity } from "./entities/ProjectEntity.js";

// Ensure environment variables are loaded
dotenv.config();

/**
 * TypeORM Data Source Configuration
 * DB-First Approach: synchronize is set to false because migrations manage the PostgreSQL schema.
 */
export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "Admin@123",
  database: process.env.DB_NAME || "enterprise_mcp",
  synchronize: false, // Schema managed via DB-first migrations
  logging: process.env.DEBUG_SQL === "true",
  entities: [EmployeeEntity, ProjectEntity]
});

let initPromise: Promise<DataSource> | null = null;

/**
 * Ensures TypeORM DataSource is initialized once (singleton pattern).
 */
export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (!initPromise) {
    initPromise = AppDataSource.initialize().catch((err) => {
      initPromise = null;
      console.error("[TypeORM Initialization Error]:", err);
      throw err;
    });
  }

  return initPromise;
}

/**
 * Retrieves the TypeORM Repository for EmployeeEntity.
 */
export async function getEmployeeRepository(): Promise<Repository<EmployeeEntity>> {
  const ds = await getDataSource();
  return ds.getRepository(EmployeeEntity);
}

/**
 * Retrieves the TypeORM Repository for ProjectEntity.
 */
export async function getProjectRepository(): Promise<Repository<ProjectEntity>> {
  const ds = await getDataSource();
  return ds.getRepository(ProjectEntity);
}

/**
 * Gracefully shuts down the TypeORM database connection.
 */
export async function closePool(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    initPromise = null;
  }
}

export const closeDatabase = closePool;
