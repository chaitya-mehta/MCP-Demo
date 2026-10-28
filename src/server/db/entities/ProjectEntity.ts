import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * TypeORM Entity mapping to 'projects' PostgreSQL table.
 * DB-First schema representation.
 */
@Entity({ name: "projects" })
export class ProjectEntity {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ name: "tech_stack", type: "text", array: true, default: "{}" })
  techStack!: string[];

  @Column({ type: "varchar", length: 50 })
  status!: "Planning" | "In Progress" | "Completed" | "On Hold";

  @Column({ name: "lead_id", type: "varchar", length: 50, nullable: true })
  leadId!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
