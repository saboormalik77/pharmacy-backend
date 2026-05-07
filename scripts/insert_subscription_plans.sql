-- Insert Subscription Plans
-- Run this script after creating the subscription_plans table
-- NOTE: You need to create products and prices in Stripe first, then update the stripe_product_id and stripe_price_id values

-- Free Plan
INSERT INTO subscription_plans (
  id, 
  name, 
  description, 
  price_monthly, 
  price_yearly,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  max_documents,
  max_distributors,
  analytics_features,
  support_level,
  is_active,
  display_order
) VALUES (
  'free',
  'Free',
  'Perfect for getting started with basic features',
  0,
  0,
  'prod_TTwAOohKX4uEAk',
  'price_1SWyI5AI9jOPJ9ML8DuX7d7E',
  NULL, -- Yearly price not created yet in Stripe
  '[
    "Up to 5 documents per month",
    "Basic analytics",
    "Email support",
    "Price comparisons for up to 10 NDC codes"
  ]'::jsonb,
  5,
  3,
  '["Basic price comparison", "Simple reports"]'::jsonb,
  'email',
  true,
  1
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_documents = EXCLUDED.max_documents,
  max_distributors = EXCLUDED.max_distributors,
  analytics_features = EXCLUDED.analytics_features,
  support_level = EXCLUDED.support_level,
  updated_at = NOW();

-- Basic Plan
INSERT INTO subscription_plans (
  id, 
  name, 
  description, 
  price_monthly, 
  price_yearly,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  max_documents,
  max_distributors,
  analytics_features,
  support_level,
  is_active,
  display_order
) VALUES (
  'basic',
  'Basic',
  'For small pharmacies with moderate needs',
  100.00,
  1000.00, -- ~17% discount for yearly (will be updated when yearly price is created)
  'prod_TTw8oKfQn9edaC',
  'price_1SWyGIAI9jOPJ9MLprOuEAdF',
  NULL, -- Yearly price not created yet in Stripe
  '[
    "Up to 25 documents per month",
    "Advanced analytics",
    "Priority email support",
    "Price comparisons for unlimited NDC codes",
    "Optimization recommendations",
    "Historical data tracking"
  ]'::jsonb,
  25,
  5,
  '[
    "Price comparison",
    "Trend analysis",
    "Optimization reports",
    "Export capabilities"
  ]'::jsonb,
  'email',
  true,
  2
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_documents = EXCLUDED.max_documents,
  max_distributors = EXCLUDED.max_distributors,
  analytics_features = EXCLUDED.analytics_features,
  support_level = EXCLUDED.support_level,
  updated_at = NOW();

-- Premium Plan
INSERT INTO subscription_plans (
  id, 
  name, 
  description, 
  price_monthly, 
  price_yearly,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  max_documents,
  max_distributors,
  analytics_features,
  support_level,
  is_active,
  display_order
) VALUES (
  'premium',
  'Premium',
  'For growing pharmacies with advanced needs',
  200.00,
  2000.00, -- ~17% discount for yearly (will be updated when yearly price is created)
  'prod_TTw7VJBAf2PcsM',
  'price_1SWyFBAI9jOPJ9MLeb85uEAM',
  NULL, -- Yearly price not created yet in Stripe
  '[
    "Unlimited documents",
    "Full analytics suite",
    "Priority support",
    "All Basic features",
    "Email integration",
    "Portal auto-fetch",
    "Custom reports",
    "API access"
  ]'::jsonb,
  NULL, -- unlimited
  NULL, -- unlimited
  '[
    "All Basic features",
    "Advanced trend analysis",
    "Predictive analytics",
    "Custom dashboards",
    "API integration"
  ]'::jsonb,
  'priority',
  true,
  3
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_documents = EXCLUDED.max_documents,
  max_distributors = EXCLUDED.max_distributors,
  analytics_features = EXCLUDED.analytics_features,
  support_level = EXCLUDED.support_level,
  updated_at = NOW();

-- Enterprise Plan
INSERT INTO subscription_plans (
  id, 
  name, 
  description, 
  price_monthly, 
  price_yearly,
  stripe_product_id,
  stripe_price_id_monthly,
  stripe_price_id_yearly,
  features,
  max_documents,
  max_distributors,
  analytics_features,
  support_level,
  is_active,
  display_order
) VALUES (
  'enterprise',
  'Enterprise',
  'For large pharmacies with custom requirements',
  35.00,
  350.00, -- ~17% discount for yearly (will be updated when yearly price is created)
  'prod_TTw34EodsCIshi',
  'price_1SWyBCAI9jOPJ9MLK3YGkA7E',
  NULL, -- Yearly price not created yet in Stripe
  '[
    "Everything in Premium",
    "Dedicated account manager",
    "Custom integrations",
    "White-label options",
    "Advanced security",
    "SLA guarantees",
    "Training & onboarding"
  ]'::jsonb,
  NULL, -- unlimited
  NULL, -- unlimited
  '[
    "All Premium features",
    "Custom analytics",
    "Dedicated infrastructure",
    "Advanced reporting"
  ]'::jsonb,
  'dedicated',
  true,
  4
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  max_documents = EXCLUDED.max_documents,
  max_distributors = EXCLUDED.max_distributors,
  analytics_features = EXCLUDED.analytics_features,
  support_level = EXCLUDED.support_level,
  updated_at = NOW();

-- Instructions:
-- ✅ Monthly prices have been added
-- ⚠️  Yearly prices still need to be created in Stripe:
--    1. Go to Stripe Dashboard > Products
--    2. For each product, add a yearly recurring price
--    3. Update the stripe_price_id_yearly values above with the new yearly price IDs
--    4. Update the price_yearly values to match the actual yearly prices
--    5. Re-run this script to update the plans with yearly price IDs
--
-- Current Stripe IDs:
-- Free:        prod_TTwAOohKX4uEAk / price_1SWyI5AI9jOPJ9ML8DuX7d7E
-- Basic:       prod_TTw8oKfQn9edaC / price_1SWyGIAI9jOPJ9MLprOuEAdF
-- Premium:     prod_TTw7VJBAf2PcsM / price_1SWyFBAI9jOPJ9MLeb85uEAM
-- Enterprise:  prod_TTw34EodsCIshi / price_1SWyBCAI9jOPJ9MLK3YGkA7E

