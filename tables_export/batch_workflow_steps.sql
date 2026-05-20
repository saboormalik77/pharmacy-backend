-- ============================================================
-- Table   : public.batch_workflow_steps
-- ============================================================

DROP TABLE IF EXISTS public."batch_workflow_steps" CASCADE;

CREATE TABLE public."batch_workflow_steps" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "batch_id" uuid NOT NULL,
    "step_key" text NOT NULL,
    "completed_at" timestamptz DEFAULT now() NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "batch_workflow_steps_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_step_key_check" CHECK (step_key = ANY (ARRAY['cardinal_generated'::text, 'cardinal_sent'::text, 'debit_memos_created'::text, 'ra_requested'::text]));

ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES return_batches(id) ON DELETE CASCADE;

ALTER TABLE public."batch_workflow_steps"
    ADD CONSTRAINT "batch_workflow_steps_batch_id_step_key_key" UNIQUE (batch_id, step_key);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS batch_workflow_steps_batch_id_step_key_key ON public.batch_workflow_steps USING btree (batch_id, step_key);
CREATE INDEX IF NOT EXISTS idx_bws_batch_id ON public.batch_workflow_steps USING btree (batch_id);

-- Row Level Security
ALTER TABLE public."batch_workflow_steps" ENABLE ROW LEVEL SECURITY;

