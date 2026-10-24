-- Test accounts + sample data for trying the website end to end (MySQL 8).
-- Run AFTER schema.sql (and optionally cms_seed.sql):
--   mysql -u root -p taxfilr < backend/src/main/resources/db/mysql/test_users.sql
--
-- Every account below has the password:   Taxfilr@123
-- (BCrypt hash generated with the backend's BCryptPasswordEncoder). Change it after first login:
--   admin panel -> sidebar -> Change password.
-- Safe to re-run: INSERT IGNORE leaves existing rows untouched.
--
-- Staff (sign in at /admin/login):
--   owner@taxfiler.in     SUPER_ADMIN          no authenticator code needed (MFA_EXEMPT_ROLES=SUPER_ADMIN default)
--   admin@taxfiler.in     ADMIN                scans an authenticator QR code on first login
--   it.pro@taxfiler.in    TAX_PROFESSIONAL
--   gst.pro@taxfiler.in   GST_PROFESSIONAL
--   reviewer@taxfiler.in  REVIEWER
--   operator@taxfiler.in  DATA_ENTRY_OPERATOR
--   support@taxfiler.in   CUSTOMER_SUPPORT
-- Customers (sign in at /auth/login, also works in the mobile app):
--   rahul@example.com     salaried, has a draft ITR-1 for FY 2024-25
--   priya@example.com     business owner, GST profile + a draft GSTR-3B for 2025-03
-- Consultant (sign in at /consultant/login, then complete the profile form there):
--   ca.meera@example.com  CONSULTANT

SET NAMES utf8mb4;
SET @pwd = '$2a$10$42WYFY06tTmn/9Md14wtr.0AuoGL3Wwq0Ky2fUPozv.6UIJw5QeCC';

-- users -------------------------------------------------------------------------------------------
INSERT IGNORE INTO users (id, name, email, phone, pan, password, role, onboarding_complete, active, mfa_secret, mfa_enabled, created_at, updated_at) VALUES
('u-owner',    'Platform Owner',           'owner@taxfiler.in',    '9000000001', NULL,         @pwd, 'SUPER_ADMIN',         1, 1, NULL, 0, NOW(6), NOW(6)),
('u-admin',    'Operations Admin',         'admin@taxfiler.in',    '9000000002', NULL,         @pwd, 'ADMIN',               1, 1, NULL, 0, NOW(6), NOW(6)),
('u-itpro',    'Income Tax Professional',  'it.pro@taxfiler.in',   '9000000003', NULL,         @pwd, 'TAX_PROFESSIONAL',    1, 1, NULL, 0, NOW(6), NOW(6)),
('u-gstpro',   'GST Professional',         'gst.pro@taxfiler.in',  '9000000004', NULL,         @pwd, 'GST_PROFESSIONAL',    1, 1, NULL, 0, NOW(6), NOW(6)),
('u-reviewer', 'Reviewer',                 'reviewer@taxfiler.in', '9000000005', NULL,         @pwd, 'REVIEWER',            1, 1, NULL, 0, NOW(6), NOW(6)),
('u-operator', 'Data Entry Operator',      'operator@taxfiler.in', '9000000006', NULL,         @pwd, 'DATA_ENTRY_OPERATOR', 1, 1, NULL, 0, NOW(6), NOW(6)),
('u-support',  'Customer Support',         'support@taxfiler.in',  '9000000007', NULL,         @pwd, 'CUSTOMER_SUPPORT',    1, 1, NULL, 0, NOW(6), NOW(6)),
('u-rahul',    'Rahul Sharma',             'rahul@example.com',    '9811111111', 'ABCPS1234D', @pwd, 'USER',                1, 1, NULL, 0, NOW(6), NOW(6)),
('u-priya',    'Priya Traders (Priya Mehta)', 'priya@example.com', '9822222222', 'AAEPM5678K', @pwd, 'USER',                1, 1, NULL, 0, NOW(6), NOW(6)),
('u-meera',    'CA Meera Iyer',            'ca.meera@example.com', '9833333333', NULL,         @pwd, 'CONSULTANT',          1, 1, NULL, 0, NOW(6), NOW(6));

-- taxpayer profiles -------------------------------------------------------------------------------
INSERT IGNORE INTO taxpayer_profiles (id, user_id, pan, taxpayer_type, date_of_birth, metro_city, address_line1, city, state, pincode, bank_account_number, bank_ifsc, bank_name, aadhaar_last_four, created_at, updated_at, version) VALUES
('tp-rahul', 'u-rahul', 'ABCPS1234D', 'INDIVIDUAL', '1992-05-14', 1, '12, MG Road',           'Mumbai',    'Maharashtra', '400001', '123456789012', 'HDFC0000123', 'HDFC Bank', '4321', NOW(6), NOW(6), 0),
('tp-priya', 'u-priya', 'AAEPM5678K', 'BUSINESS',   '1988-11-02', 0, 'Shop 4, Sadar Bazaar',  'Jaipur',    'Rajasthan',   '302001', '987654321098', 'SBIN0001234', 'State Bank of India', '8765', NOW(6), NOW(6), 0);

-- GST registration for the business owner -------------------------------------------------------
INSERT IGNORE INTO gst_profiles (id, user_id, gstin, legal_name, trade_name, business_type, business_activity, state, registered_address, authorized_signatory, signatory_designation, registration_date, composition_scheme, active, bank_account_number, bank_ifsc, created_at, updated_at, version) VALUES
('gp-priya', 'u-priya', '08AAEPM5678K1Z5', 'Priya Mehta', 'Priya Traders', 'Proprietorship', 'Trading - garments', 'Rajasthan', 'Shop 4, Sadar Bazaar, Jaipur 302001', 'Priya Mehta', 'Proprietor', '2021-07-01', 0, 1, '987654321098', 'SBIN0001234', NOW(6), NOW(6), 0);

-- financial year ----------------------------------------------------------------------------------
INSERT IGNORE INTO financial_years (id, code, assessment_year, start_date, end_date, open, notes) VALUES
('fy-2024-25', '2024-25', '2025-26', '2024-04-01', '2025-03-31', 1, 'Test data'),
('fy-2025-26', '2025-26', '2026-27', '2025-04-01', '2026-03-31', 1, 'Test data');

-- sample cases ------------------------------------------------------------------------------------
INSERT IGNORE INTO filing_cases (id, case_number, customer_id, tax_type, return_type, financial_year, assessment_year, period, status, priority, state, due_date, deleted, created_at, updated_at, version) VALUES
('case-rahul-itr', 'TAX-2025-000001',  'u-rahul', 'INCOME_TAX', 'ITR_1',   '2024-25', '2025-26', NULL,      'DRAFT', 'MEDIUM', 'Maharashtra', '2025-07-31', 0, NOW(6), NOW(6), 0),
('case-priya-gst', 'TAX-2025-000002', 'u-priya', 'GST',        'GSTR_3B', '2024-25', '2025-26', '2025-03', 'DRAFT', 'MEDIUM', 'Rajasthan',   '2025-04-20', 0, NOW(6), NOW(6), 0);

INSERT IGNORE INTO income_tax_filings (id, case_id, taxpayer_type, basic_salary, hra_received, rent_paid, selected_regime, created_at, updated_at, version) VALUES
('itf-rahul', 'case-rahul-itr', 'INDIVIDUAL', 850000.00, 180000.00, 240000.00, 'NEW', NOW(6), NOW(6), 0);

INSERT IGNORE INTO gst_filings (id, case_id, gst_profile_id, created_at, updated_at, version) VALUES
('gstf-priya', 'case-priya-gst', 'gp-priya', NOW(6), NOW(6), 0);

INSERT IGNORE INTO case_events (id, case_id, action, note, from_status, to_status, actor_id, created_at) VALUES
('ev-rahul-1', 'case-rahul-itr', 'CASE_CREATED', 'Case created from test data', NULL, 'DRAFT', 'u-rahul', NOW(6)),
('ev-priya-1', 'case-priya-gst', 'CASE_CREATED', 'Case created from test data', NULL, 'DRAFT', 'u-priya', NOW(6));
