import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

/**
 * TypeORM Entity mapping to 'employees' PostgreSQL table.
 * DB-First schema representation.
 */
@Entity({ name: "employees" })
export class EmployeeEntity {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 255 })
  designation!: string;

  @Column({ type: "varchar", length: 255 })
  department!: string;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ name: "join_date", type: "date" })
  joinDate!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
