-- Subscription Tables Migration Script
-- Run this script in your Supabase SQL Editor

-- Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id VARCHAR(50) PRIMARY KEY CHECK (id IN ('free', 'basic', 'premium', 'enterprise')),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  stripe_product_id VARCHAR(255),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_documents INTEGER,
  max_distributors INTEGER,
  analytics_features JSONB DEFAULT '[]'::jsonb,
  support_level VARCHAR(50) CHECK (support_level IN ('email', 'priority', 'dedicated')),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update subscriptions table to include Stripe fields
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_current_period_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_cancel_at_period_end BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_canceled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_ended_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS stripe_latest_invoice_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS trial_start TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trial_end TIMESTAMP WITH TIME ZONE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_pharmacy_id ON subscriptions(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_active ON subscription_plans(is_active);

-- Add comments
COMMENT ON TABLE subscription_plans IS 'Stores subscription plan details and Stripe product/price IDs';
COMMENT ON TABLE subscriptions IS 'Stores pharmacy subscriptions with Stripe integration';

