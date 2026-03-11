-- ============================================================
-- FCR Module 5 — Seed Data for Policy Engine (for development/testing)
-- Run this AFTER fcr_08_create_policy_engine_tables.sql
-- ============================================================

-- ============================================================
-- 1. Manufacturer Policies (10 realistic manufacturers)
-- ============================================================

INSERT INTO manufacturer_policies (id, labeler_id, labeler_type, manufacturer_name, address_1, city, state, zip, main_contact, main_phone, fax, credit_request_email, average_pay_percent, average_days_to_pay, verified_date)
VALUES
  -- Labeler 43547 = Solco Healthcare (Doxycycline Hyclate — your test NDC 43547-325-06)
  ('a0000001-0000-0000-0000-000000000001', '43547', 'generic', 'Solco Healthcare US LLC', '328 Wall St', 'Princeton', 'NJ', '08540', 'Returns Dept', '(609) 555-1001', '(609) 555-1002', 'returns@solcohealthcare.com', 68.50, 210, '2025-12-01'),

  -- Labeler 00093 = Teva Pharmaceuticals
  ('a0000001-0000-0000-0000-000000000002', '00093', 'generic', 'Teva Pharmaceuticals USA Inc', '1090 Horsham Rd', 'North Wales', 'PA', '19454', 'Customer Service', '(888) 838-2872', '(215) 591-3000', 'returns@tevapharm.com', 72.30, 180, '2025-11-15'),

  -- Labeler 16729 = Accord Healthcare
  ('a0000001-0000-0000-0000-000000000003', '16729', 'generic', 'Accord Healthcare Inc', '1009 Slater Rd', 'Durham', 'NC', '27703', 'Returns Team', '(919) 555-3001', NULL, 'returns@accord-healthcare.com', 65.00, 240, '2025-10-20'),

  -- Labeler 00069 = Pfizer (brand)
  ('a0000001-0000-0000-0000-000000000004', '00069', 'brand', 'Pfizer Inc', '235 E 42nd St', 'New York', 'NY', '10017', 'Pharma Returns', '(800) 438-1985', '(212) 733-2323', 'pharma.returns@pfizer.com', 85.00, 120, '2026-01-10'),

  -- Labeler 00074 = Eli Lilly (brand)
  ('a0000001-0000-0000-0000-000000000005', '00074', 'brand', 'Eli Lilly and Company', 'Lilly Corporate Center', 'Indianapolis', 'IN', '46285', 'Return Services', '(800) 545-5979', '(317) 276-2000', 'returns@lilly.com', 80.00, 150, '2025-09-01'),

  -- Labeler 59762 = Aurobindo Pharma
  ('a0000001-0000-0000-0000-000000000006', '59762', 'generic', 'Aurobindo Pharma USA Inc', '279 Princeton-Hightstown Rd', 'East Windsor', 'NJ', '08520', 'Credit Dept', '(866) 850-2876', NULL, 'credits@aurobindousa.com', 60.00, 300, '2025-08-15'),

  -- Labeler 68462 = Glenmark Pharmaceuticals
  ('a0000001-0000-0000-0000-000000000007', '68462', 'generic', 'Glenmark Pharmaceuticals Inc', '750 Corporate Dr', 'Mahwah', 'NJ', '07430', 'Returns', '(888) 721-7115', NULL, 'returns@glenmarkpharma.com', 55.00, 350, '2025-07-20'),

  -- Labeler 50228 = Endo Pharmaceuticals (brand + generic)
  ('a0000001-0000-0000-0000-000000000008', '50228', 'brand', 'Endo Pharmaceuticals Inc', '1400 Atwater Dr', 'Malvern', 'PA', '19355', 'Accounts Receivable', '(800) 462-3636', '(610) 558-9700', 'ar@endo.com', 75.00, 200, '2025-11-01'),

  -- Labeler 00378 = Mylan (Viatris)
  ('a0000001-0000-0000-0000-000000000009', '00378', 'generic', 'Mylan Pharmaceuticals Inc (Viatris)', '781 Chestnut Ridge Rd', 'Morgantown', 'WV', '26505', 'Returns Processing', '(800) 796-9526', '(304) 599-2595', 'returns@viatris.com', 70.00, 190, '2026-02-01'),

  -- Labeler 64980 = Rising Pharmaceuticals (NO return policy — will test TBD with sub-records missing)
  ('a0000001-0000-0000-0000-000000000010', '64980', 'generic', 'Rising Pharmaceuticals Inc', '174 Union St', 'Saddle Brook', 'NJ', '07663', 'Returns', '(201) 961-9200', NULL, NULL, 45.00, 400, '2025-06-01')
ON CONFLICT (labeler_id) DO NOTHING;


-- ============================================================
-- 2. Manufacturer Return Policies (sub-records)
-- ============================================================

INSERT INTO manufacturer_return_policies (manufacturer_policy_id, destination, auto_ra_email, policy_number, policy_description, months_before_expiration, months_after_expiration, discount_rate, partials_accepted, partial_dosage_forms, reimbursement_type)
VALUES
  -- Solco Healthcare → Inmar, 6-12, partials yes (tablets, capsules)
  ('a0000001-0000-0000-0000-000000000001', 'inmar', 'ra-request@inmar.com', 101, '6 Months Prior to 12 Months Post Drug Expiration', 6, 12, 0.5000, true, ARRAY['TABLET', 'TABLET, DELAYED RELEASE', 'CAPSULE'], 'batch'),

  -- Teva → Qualanex, 6-6, partials yes (tablets, capsules, oral solutions)
  ('a0000001-0000-0000-0000-000000000002', 'qualanex', 'customerservice@qualanex.com', 201, '6 Months Prior to 6 Months Post Drug Expiration', 6, 6, 0.4500, true, ARRAY['TABLET', 'CAPSULE', 'SOLUTION'], 'batch'),

  -- Accord Healthcare → Inmar, 6-6, no partials
  ('a0000001-0000-0000-0000-000000000003', 'inmar', 'ra-request@inmar.com', 301, '6 Months Prior to 6 Months Post Drug Expiration', 6, 6, 0.5000, false, NULL, 'batch'),

  -- Pfizer → PharmaLink, 6-12, partials yes (all forms)
  ('a0000001-0000-0000-0000-000000000004', 'pharmalink', 'returns@pharmalink.com', 401, '6 Months Prior to 12 Months Post Drug Expiration', 6, 12, 0.3500, true, ARRAY['TABLET', 'CAPSULE', 'INJECTION', 'SOLUTION'], 'per_item'),

  -- Eli Lilly → Inmar, 6-6, partials no
  ('a0000001-0000-0000-0000-000000000005', 'inmar', 'ra-request@inmar.com', 501, '6 Months Prior to 6 Months Post Drug Expiration', 6, 6, 0.4000, false, NULL, 'per_item'),

  -- Aurobindo → Qualanex, 6-12, partials yes
  ('a0000001-0000-0000-0000-000000000006', 'qualanex', 'customerservice@qualanex.com', 601, '6 Months Prior to 12 Months Post Drug Expiration', 6, 12, 0.5500, true, ARRAY['TABLET', 'CAPSULE'], 'batch'),

  -- Glenmark → Inmar, 3-6, partials no (short window)
  ('a0000001-0000-0000-0000-000000000007', 'inmar', 'ra-request@inmar.com', 701, '3 Months Prior to 6 Months Post Drug Expiration', 3, 6, 0.6000, false, NULL, 'batch'),

  -- Endo → PharmaLink, 6-12, partials yes
  ('a0000001-0000-0000-0000-000000000008', 'pharmalink', 'returns@pharmalink.com', 801, '6 Months Prior to 12 Months Post Drug Expiration', 6, 12, 0.4000, true, ARRAY['TABLET', 'CAPSULE'], 'per_item'),

  -- Mylan (Viatris) → Qualanex, 6-6, partials yes (tablets only)
  ('a0000001-0000-0000-0000-000000000009', 'qualanex', 'customerservice@qualanex.com', 901, '6 Months Prior to 6 Months Post Drug Expiration', 6, 6, 0.5000, true, ARRAY['TABLET'], 'batch')

  -- NOTE: Rising Pharmaceuticals (64980) intentionally has NO return policy sub-record
  -- to test the TBD / no_return_policy scenario.
ON CONFLICT DO NOTHING;


-- ============================================================
-- 3. Non-Returnable Products (NDC-level exceptions)
-- ============================================================

INSERT INTO non_returnable_products (manufacturer_policy_id, ndc, product_name, reason)
VALUES
  -- Teva: specific NDC excluded (controlled substance)
  ('a0000001-0000-0000-0000-000000000002', '00093-0150-01', 'Acetaminophen/Codeine 300-30mg Tablets', 'Controlled substance — requires DEA Form 222'),

  -- Pfizer: specific NDC excluded (cold chain)
  ('a0000001-0000-0000-0000-000000000004', '00069-3150-83', 'Prevnar 20 Vaccine', 'Cold chain product — cannot be returned via standard process'),

  -- Solco: specific NDC excluded (recalled)
  ('a0000001-0000-0000-0000-000000000001', '43547-0281-11', 'Valsartan 320mg Tablets', 'Recalled product — handle through separate recall process')
ON CONFLICT DO NOTHING;


-- ============================================================
-- 4. Manufacturer Policy Notes (sample history)
-- ============================================================

INSERT INTO manufacturer_policy_notes (manufacturer_policy_id, note_date, author_initials, note_text)
VALUES
  ('a0000001-0000-0000-0000-000000000001', '2025-12-01', 'JV', 'Verified return policy with Solco rep. 6-12 window confirmed. Partials accepted for tablets and delayed release tablets.'),
  ('a0000001-0000-0000-0000-000000000001', '2025-06-15', 'JD', 'Solco increased discount rate from 45% to 50% effective July 2025.'),

  ('a0000001-0000-0000-0000-000000000002', '2025-11-15', 'JV', 'Teva return window is strict 6-6. They reject anything outside window. Qualanex is preferred destination.'),

  ('a0000001-0000-0000-0000-000000000003', '2025-10-20', 'JV', 'Accord does NOT accept partials. Full bottles only. Confirmed with rep.'),

  ('a0000001-0000-0000-0000-000000000004', '2026-01-10', 'JD', 'Pfizer brand products route through PharmaLink. They process same-day RA requests.'),

  ('a0000001-0000-0000-0000-000000000007', '2025-07-20', 'JV', 'Glenmark has a shorter window — only 3 months before expiry. Be careful with timing.'),

  ('a0000001-0000-0000-0000-000000000010', '2025-06-01', 'JD', 'Rising Pharmaceuticals — no return policy on file. Contact manufacturer to confirm. TBD for now.')
ON CONFLICT DO NOTHING;
