-- ============================================================
-- Table   : public.refresh_tokens
-- ============================================================

DROP TABLE IF EXISTS public."refresh_tokens" CASCADE;

CREATE TABLE public."refresh_tokens" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "pharmacy_id" uuid NOT NULL,
    "token_hash" text NOT NULL,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    "last_used_at" timestamptz,
    "revoked_at" timestamptz,
    "user_agent" text,
    "ip_address" inet,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY (id)
);

-- Constraints
ALTER TABLE public."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_pharmacy_id_fkey" FOREIGN KEY (pharmacy_id) REFERENCES pharmacy(id) ON DELETE CASCADE;

ALTER TABLE public."refresh_tokens"
    ADD CONSTRAINT "refresh_tokens_token_hash_key" UNIQUE (token_hash);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_pharmacy_id ON public.refresh_tokens USING btree (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON public.refresh_tokens USING btree (token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);

-- Row Level Security
ALTER TABLE public."refresh_tokens" ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "all policy" ON public."refresh_tokens";
CREATE POLICY "all policy"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "pharmacy_own_refresh_tokens" ON public."refresh_tokens";
CREATE POLICY "pharmacy_own_refresh_tokens"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO 16481
    USING (pharmacy_id = auth.uid())
    WITH CHECK (pharmacy_id = auth.uid());

DROP POLICY IF EXISTS "service_role_all_refresh_tokens" ON public."refresh_tokens";
CREATE POLICY "service_role_all_refresh_tokens"
    ON public."refresh_tokens"
    AS PERMISSIVE
    FOR ALL TO 16482
    USING (true)
    WITH CHECK (true);

