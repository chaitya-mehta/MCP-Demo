-- ====================================================================
-- Migration: 002_seed_data.sql
-- Description: Seed initial employee and project records into PostgreSQL
-- Idempotent: Uses ON CONFLICT to allow safe re-runs
-- ====================================================================

-- 1. Insert Initial Employees
INSERT INTO employees (id, name, designation, department, email, join_date)
VALUES
    ('101', 'Alex Rivera', 'Senior Full Stack Engineer', 'Engineering', 'alex.rivera@example.com', '2021-03-15'),
    ('102', 'Priya Sharma', 'Staff AI Engineer', 'Data & AI', 'priya.sharma@example.com', '2022-07-01'),
    ('103', 'Marcus Chen', 'Lead Product Designer', 'Product Design', 'marcus.chen@example.com', '2020-11-20'),
    ('104', 'Elena Rostova', 'Engineering Manager', 'Engineering', 'elena.rostova@example.com', '2019-05-10')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    designation = EXCLUDED.designation,
    department = EXCLUDED.department,
    email = EXCLUDED.email,
    join_date = EXCLUDED.join_date,
    updated_at = CURRENT_TIMESTAMP;

-- 2. Insert Initial Projects
INSERT INTO projects (id, name, description, tech_stack, status, lead_id)
VALUES
    (
        'P101',
        'Project Aurora (AI Knowledge Assistant)',
        'Enterprise knowledge assistant utilizing MCP protocol, vector databases, and LLM reasoning.',
        ARRAY['Node.js', 'TypeScript', 'MCP SDK', 'OpenAI API', 'PostgreSQL (pgvector)'],
        'In Progress',
        '102'
    ),
    (
        'P102',
        'Cloud Platform Modernization',
        'Migrating legacy monolithic workloads to Kubernetes microservices with zero-trust networking.',
        ARRAY['Go', 'Kubernetes', 'Terraform', 'AWS', 'gRPC'],
        'Completed',
        '101'
    ),
    (
        'P103',
        'Customer Experience Portal 2.0',
        'Revamped customer self-service dashboard with real-time telemetry and accessibility compliance.',
        ARRAY['React', 'TypeScript', 'Tailwind CSS', 'GraphQL', 'Fastify'],
        'Planning',
        '103'
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    tech_stack = EXCLUDED.tech_stack,
    status = EXCLUDED.status,
    lead_id = EXCLUDED.lead_id,
    updated_at = CURRENT_TIMESTAMP;
