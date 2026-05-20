-- ============================================================
-- Table   : public.pharmacy_branch_role_assignments
-- ============================================================

DROP TABLE IF EXISTS public."pharmacy_branch_role_assignments" CASCADE;

CREATE TABLE public."pharmacy_branch_role_assignments" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "branch_pharmacy_id" uuid NOT NULL,
    "role_id" uuid NOT NULL,
    "assigned_by" uuid NOT NULL,
    "assigned_at" timestamptz DEFAULT now(),
    CONSTRAINT "pharmacy_branch_role_assignments_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES pharmacy(id);

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_branch_pharmacy_id_fkey" FOREIGN KEY (branch_pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES pharmacy_roles(id) ON DELETE CASCADE;

ALTER TABLE public."pharmacy_branch_role_assignments"
    ADD CONSTRAINT "pharmacy_branch_role_assignments_branch_pharmacy_id_role_id_key" UNIQUE (branch_pharmacy_id, role_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branch_role_assign_branch ON public.pharmacy_branch_role_assignments USING btree (branch_pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_branch_role_assign_role ON public.pharmacy_branch_role_assignments USING btree (role_id);
CREATE UNIQUE INDEX IF NOT EXISTS pharmacy_branch_role_assignments_branch_pharmacy_id_role_id_key ON public.pharmacy_branch_role_assignments USING btree (branch_pharmacy_id, role_id);

-- Row Level Security
ALTER TABLE public."pharmacy_branch_role_assignments" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Service role full access on pharmacy_branch_role_assignments" ON public."pharmacy_branch_role_assignments";
CREATE POLICY "Service role full access on pharmacy_branch_role_assignments"
    ON public."pharmacy_branch_role_assignments"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "all policy" ON public."pharmacy_branch_role_assignments";
CREATE POLICY "all policy"
    ON public."pharmacy_branch_role_assignments"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

