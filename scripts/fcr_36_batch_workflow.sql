-- FCR-36: Batch Post-Closeout Workflow Steps
-- Tracks the 4-step workflow a batch goes through after being closed:
--   1. cardinal_generated  — Cardinal file downloaded
--   2. cardinal_sent       — Cardinal file uploaded/sent
--   3. debit_memos_created — Debit memos confirmed / viewed
--   4. ra_requested        — Return Authorizations requested

CREATE TABLE IF NOT EXISTS batch_workflow_steps (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     UUID        NOT NULL REFERENCES return_batches(id) ON DELETE CASCADE,
  step_key     TEXT        NOT NULL CHECK (step_key IN (
                             'cardinal_generated',
                             'cardinal_sent',
                             'debit_memos_created',
                             'ra_requested'
                           )),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(batch_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_bws_batch_id ON batch_workflow_steps(batch_id);

ALTER TABLE batch_workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access via service role" ON batch_workflow_steps;
CREATE POLICY "Allow all access via service role" ON batch_workflow_steps
  FOR ALL USING (true) WITH CHECK (true);
