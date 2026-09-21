-- MySQL 8 schema for the TaxFilr backend (generated from the JPA model, MySQLDialect).
-- Apply once to an empty database, e.g.  mysql -h <host> -u <user> -p < schema.sql
-- Run the API with SPRING_PROFILES_ACTIVE=mysql (ddl-auto=validate) afterwards.

CREATE DATABASE IF NOT EXISTS taxfilr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taxfilr;

-- Table: audit_logs
CREATE TABLE audit_logs (
    created_at datetime(6),
    new_value varchar(4000),
    old_value varchar(4000),
    action varchar(255) not null,
    actor_email varchar(255),
    actor_id varchar(255),
    actor_role varchar(255),
    entity_id varchar(255),
    entity_type varchar(255) not null,
    id varchar(255) not null,
    ip_address varchar(255),
    trace_id varchar(255),
    user_agent varchar(255),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: case_events
CREATE TABLE case_events (
    created_at datetime(6),
    note varchar(1000),
    action varchar(255) not null,
    actor_id varchar(255),
    case_id varchar(255) not null,
    id varchar(255) not null,
    from_status enum ('DRAFT','DOCUMENTS_PENDING','DATA_PENDING','DATA_IMPORTED','RECONCILIATION_PENDING','RECONCILIATION_COMPLETED','UNDER_REVIEW','QUERY_RAISED','USER_ACTION_REQUIRED','APPROVED','READY_FOR_FILING','FILED','VERIFICATION_PENDING','VERIFIED','ACKNOWLEDGEMENT_RECEIVED','COMPLETED','REJECTED'),
    to_status enum ('DRAFT','DOCUMENTS_PENDING','DATA_PENDING','DATA_IMPORTED','RECONCILIATION_PENDING','RECONCILIATION_COMPLETED','UNDER_REVIEW','QUERY_RAISED','USER_ACTION_REQUIRED','APPROVED','READY_FOR_FILING','FILED','VERIFICATION_PENDING','VERIFIED','ACKNOWLEDGEMENT_RECEIVED','COMPLETED','REJECTED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: client_tax_payments
CREATE TABLE client_tax_payments (
    amount decimal(38,2) not null,
    paid_on date not null,
    assessment_year varchar(7),
    financial_year varchar(7) not null,
    created_at datetime(6) not null,
    updated_at datetime(6),
    verified_at datetime(6),
    notes varchar(2000),
    challan_number varchar(255),
    id varchar(255) not null,
    owner_id varchar(255) not null,
    payment_method varchar(255),
    proof_document_id varchar(255),
    verification_note varchar(255),
    verified_by varchar(255),
    type enum ('ADVANCE_TAX','SELF_ASSESSMENT_TAX','TDS','GST','OTHER') not null,
    verification_status enum ('PENDING','VERIFIED','REJECTED') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: cms_entries
CREATE TABLE cms_entries (
    sort_order integer not null,
    version integer not null,
    created_at datetime(6),
    published_at datetime(6),
    updated_at datetime(6),
    collection varchar(64) not null,
    slug varchar(160) not null,
    title varchar(200),
    data longtext not null,
    id varchar(255) not null,
    updated_by varchar(255),
    status enum ('DRAFT','PUBLISHED') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_availability
CREATE TABLE consultant_availability (
    end_time time(6) not null,
    start_time time(6) not null,
    consultant_id varchar(255) not null,
    id varchar(255) not null,
    day_of_week enum ('MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_holidays
CREATE TABLE consultant_holidays (
    holiday_date date not null,
    consultant_id varchar(255) not null,
    id varchar(255) not null,
    reason varchar(255),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_payouts
CREATE TABLE consultant_payouts (
    booking_count integer not null,
    commission_amount decimal(38,2) not null,
    gross_amount decimal(38,2) not null,
    net_amount decimal(38,2) not null,
    created_at datetime(6),
    paid_at datetime(6),
    consultant_id varchar(255) not null,
    id varchar(255) not null,
    payment_reference varchar(255),
    reference varchar(255) not null,
    status enum ('PENDING','PAID','FAILED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_profiles
CREATE TABLE consultant_profiles (
    average_rating decimal(38,2),
    base_fee decimal(38,2) not null,
    completed_consultations integer not null,
    experience_years integer not null,
    review_count integer not null,
    slot_duration_minutes integer not null,
    verified bit not null,
    created_at datetime(6),
    updated_at datetime(6),
    verified_at datetime(6),
    category_slugs varchar(1000),
    specializations varchar(1000),
    verification_notes varchar(2000),
    bio varchar(4000),
    bank_account_name varchar(255),
    bank_account_number_masked varchar(255),
    bank_ifsc varchar(255),
    city varchar(255),
    consultation_modes varchar(255),
    id varchar(255) not null,
    languages varchar(255),
    photo_url varchar(255),
    professional_type_id varchar(255) not null,
    qualification varchar(255),
    registration_number varchar(255),
    state varchar(255),
    upi_id varchar(255),
    user_id varchar(255) not null,
    status enum ('PENDING_VERIFICATION','UNDER_REVIEW','APPROVED','ACTIVE','SUSPENDED','REJECTED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_reviews
CREATE TABLE consultant_reviews (
    rating integer not null,
    created_at datetime(6),
    comment varchar(2000),
    booking_id varchar(255) not null,
    client_id varchar(255) not null,
    consultant_id varchar(255) not null,
    id varchar(255) not null,
    moderation_note varchar(255),
    moderation enum ('PUBLISHED','HIDDEN'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultant_services
CREATE TABLE consultant_services (
    active bit not null,
    duration_minutes integer not null,
    fee decimal(38,2) not null,
    description varchar(2000),
    category_id varchar(255),
    consultant_id varchar(255) not null,
    id varchar(255) not null,
    modes varchar(255),
    title varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultation_bookings
CREATE TABLE consultation_bookings (
    commission_amount decimal(38,2),
    consultant_earning decimal(38,2),
    consultation_fee decimal(38,2) not null,
    discount decimal(38,2),
    platform_fee decimal(38,2),
    tax_amount decimal(38,2),
    total_amount decimal(38,2) not null,
    urgent bit not null,
    completed_at datetime(6),
    created_at datetime(6),
    paid_at datetime(6),
    scheduled_end datetime(6) not null,
    scheduled_start datetime(6) not null,
    updated_at datetime(6),
    version bigint,
    client_notes varchar(2000),
    consultant_notes varchar(2000),
    cancellation_reason varchar(255),
    category_id varchar(255),
    client_id varchar(255) not null,
    consultant_id varchar(255) not null,
    coupon_code varchar(255),
    id varchar(255) not null,
    invoice_number varchar(255),
    meeting_link varchar(255),
    payment_reference varchar(255),
    payout_id varchar(255),
    reference varchar(255) not null,
    service_id varchar(255),
    mode enum ('VIDEO','PHONE','CHAT','IN_PERSON') not null,
    payment_status enum ('PENDING','PAID','FAILED','REFUNDED'),
    status enum ('REQUESTED','PAYMENT_PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','RESCHEDULED','NO_SHOW','REFUND_REQUESTED','REFUNDED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultation_categories
CREATE TABLE consultation_categories (
    active bit not null,
    sort_order integer not null,
    starting_fee decimal(38,2),
    description varchar(255),
    id varchar(255) not null,
    name varchar(255) not null,
    recommended_types varchar(255),
    slug varchar(255) not null,
    domain enum ('INCOME_TAX','GST','LEGAL','ACCOUNTING','OTHER') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: consultation_messages
CREATE TABLE consultation_messages (
    created_at datetime(6),
    read_at datetime(6),
    body varchar(4000) not null,
    attachment_document_id varchar(255),
    booking_id varchar(255) not null,
    id varchar(255) not null,
    sender_id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: coupons
CREATE TABLE coupons (
    active bit not null,
    amount_off decimal(38,2),
    max_redemptions integer,
    percent_off decimal(38,2),
    redemptions integer not null,
    valid_from date,
    valid_to date,
    code varchar(255) not null,
    description varchar(255),
    id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: deductions
CREATE TABLE deductions (
    amount decimal(38,2) not null,
    description varchar(255),
    filing_id varchar(255) not null,
    id varchar(255) not null,
    section varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: document_shares
CREATE TABLE document_shares (
    created_at datetime(6),
    revoked_at datetime(6),
    booking_id varchar(255) not null,
    document_id varchar(255) not null,
    id varchar(255) not null,
    shared_by_id varchar(255) not null,
    shared_with_id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: documents
CREATE TABLE documents (
    expires_on date,
    version_number integer not null,
    created_at datetime(6),
    size_bytes bigint not null,
    verified_at datetime(6),
    case_id varchar(255),
    checksum_sha256 varchar(255),
    content_type varchar(255),
    file_name varchar(255) not null,
    id varchar(255) not null,
    owner_id varchar(255) not null,
    rejection_reason varchar(255),
    storage_key varchar(255) not null,
    superseded_by_document_id varchar(255),
    verified_by_id varchar(255),
    category enum ('PAN','AADHAAR_PROOF','FORM_16','BANK_STATEMENT','INVESTMENT_PROOF','SALARY_SLIP','CAPITAL_GAIN_STATEMENT','INVOICE','PURCHASE_REGISTER','SALES_REGISTER','GST_REPORT','PREVIOUS_ACKNOWLEDGEMENT','OTHER') not null,
    scan_status enum ('PENDING','CLEAN','INFECTED','SKIPPED'),
    status enum ('UPLOADED','VERIFIED','REJECTED','EXPIRED','SUPERSEDED'),
    tax_type enum ('INCOME_TAX','GST'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: filing_cases
CREATE TABLE filing_cases (
    deleted bit not null,
    due_date date,
    completed_at datetime(6),
    created_at datetime(6),
    submitted_at datetime(6),
    updated_at datetime(6),
    version bigint,
    assessment_year varchar(255),
    assigned_to_id varchar(255),
    case_number varchar(255) not null,
    customer_id varchar(255) not null,
    financial_year varchar(255),
    id varchar(255) not null,
    period varchar(255),
    state varchar(255),
    priority enum ('LOW','MEDIUM','HIGH','URGENT'),
    return_type enum ('ITR_1','ITR_2','ITR_3','ITR_4','GSTR_1','GSTR_3B'),
    status enum ('DRAFT','DOCUMENTS_PENDING','DATA_PENDING','DATA_IMPORTED','RECONCILIATION_PENDING','RECONCILIATION_COMPLETED','UNDER_REVIEW','QUERY_RAISED','USER_ACTION_REQUIRED','APPROVED','READY_FOR_FILING','FILED','VERIFICATION_PENDING','VERIFIED','ACKNOWLEDGEMENT_RECEIVED','COMPLETED','REJECTED') not null,
    tax_type enum ('INCOME_TAX','GST') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: filing_comments
CREATE TABLE filing_comments (
    internal bit not null,
    created_at datetime(6),
    message varchar(2000) not null,
    author_id varchar(255) not null,
    case_id varchar(255) not null,
    id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: filing_queries
CREATE TABLE filing_queries (
    due_date date,
    closed_at datetime(6),
    created_at datetime(6),
    version bigint,
    question varchar(2000) not null,
    case_id varchar(255) not null,
    id varchar(255) not null,
    query_number varchar(255) not null,
    raised_by_id varchar(255) not null,
    category enum ('DOCUMENT','INCOME','DEDUCTION','GST_INVOICE','RECONCILIATION','PAYMENT','OTHER') not null,
    priority enum ('LOW','MEDIUM','HIGH','URGENT'),
    status enum ('OPEN','RESPONDED','ACCEPTED','REJECTED','CLOSED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: financial_years
CREATE TABLE financial_years (
    end_date date not null,
    open bit not null,
    start_date date not null,
    assessment_year varchar(7) not null,
    code varchar(7) not null,
    id varchar(255) not null,
    notes varchar(255),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gst_filings
CREATE TABLE gst_filings (
    created_at datetime(6),
    reconciled_at datetime(6),
    updated_at datetime(6),
    version bigint,
    acknowledgement_reference varchar(255),
    case_id varchar(255) not null,
    computation_json TEXT,
    gst_profile_id varchar(255) not null,
    id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gst_invoices
CREATE TABLE gst_invoices (
    cess decimal(38,2),
    cgst decimal(38,2),
    igst decimal(38,2),
    invoice_date date not null,
    itc_eligible bit not null,
    reverse_charge bit not null,
    sgst decimal(38,2),
    taxable_value decimal(38,2) not null,
    created_at datetime(6),
    counterparty_gstin varchar(255),
    counterparty_name varchar(255),
    filing_id varchar(255) not null,
    hsn_sac_code varchar(255),
    id varchar(255) not null,
    invoice_number varchar(255) not null,
    place_of_supply varchar(255),
    document_type enum ('SALES','PURCHASE','CREDIT_NOTE','DEBIT_NOTE_ISSUED','DEBIT_NOTE_RECEIVED','SALES_RETURN','PURCHASE_RETURN') not null,
    source enum ('TAXPAYER_BOOKS','COUNTERPARTY_RECORD') not null,
    supply_type enum ('TAXABLE','EXEMPT','NIL_RATED','NON_GST','ZERO_RATED') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gst_profiles
CREATE TABLE gst_profiles (
    active bit not null,
    composition_scheme bit not null,
    registration_date date,
    created_at datetime(6),
    updated_at datetime(6),
    version bigint,
    authorized_signatory varchar(255),
    bank_account_number varchar(255),
    bank_ifsc varchar(255),
    business_activity varchar(255),
    business_type varchar(255),
    gstin varchar(255) not null,
    id varchar(255) not null,
    legal_name varchar(255) not null,
    registered_address varchar(255),
    signatory_designation varchar(255),
    state varchar(255),
    trade_name varchar(255),
    user_id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: gst_reconciliation_entries
CREATE TABLE gst_reconciliation_entries (
    resolved bit not null,
    tax_difference decimal(38,2),
    taxable_value_difference decimal(38,2),
    created_at datetime(6),
    remarks varchar(1000),
    book_invoice_id varchar(255),
    counterparty_gstin varchar(255),
    counterparty_invoice_id varchar(255),
    filing_id varchar(255) not null,
    id varchar(255) not null,
    invoice_number varchar(255),
    status enum ('MATCHED','PARTIALLY_MATCHED','MISSING_IN_PORTAL','MISSING_IN_BOOKS','DUPLICATE','MISMATCH','NEEDS_REVIEW') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: income_sources
CREATE TABLE income_sources (
    amount decimal(38,2) not null,
    deductible_amount decimal(38,2),
    description varchar(255),
    filing_id varchar(255) not null,
    id varchar(255) not null,
    type enum ('SALARY','BUSINESS','PROFESSIONAL','INTEREST','RENTAL','CAPITAL_GAINS_SHORT_TERM','CAPITAL_GAINS_LONG_TERM','DIVIDEND','OTHER') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: income_tax_filings
CREATE TABLE income_tax_filings (
    basic_salary decimal(38,2),
    hra_received decimal(38,2),
    rent_paid decimal(38,2),
    created_at datetime(6),
    updated_at datetime(6),
    version bigint,
    case_id varchar(255) not null,
    computation_json TEXT,
    id varchar(255) not null,
    selected_regime varchar(255),
    taxpayer_type enum ('INDIVIDUAL','HUF','BUSINESS','PROFESSIONAL','OTHER'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: investments
CREATE TABLE investments (
    actual_return decimal(38,2),
    amount decimal(38,2) not null,
    expected_return decimal(38,2),
    invested_on date not null,
    maturity_date date,
    tax_saving_eligible_amount decimal(38,2) not null,
    financial_year varchar(7) not null,
    created_at datetime(6) not null,
    updated_at datetime(6),
    verified_at datetime(6),
    notes varchar(2000),
    id varchar(255) not null,
    name varchar(255),
    owner_id varchar(255) not null,
    proof_document_id varchar(255),
    section varchar(255),
    verification_note varchar(255),
    verified_by varchar(255),
    type enum ('MUTUAL_FUND','STOCKS','PPF','ELSS','NPS','INSURANCE','FIXED_DEPOSIT','BONDS','OTHER') not null,
    verification_status enum ('PENDING','VERIFIED','REJECTED') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notification_templates
CREATE TABLE notification_templates (
    active bit not null,
    email bit not null,
    in_app bit not null,
    sms bit not null,
    created_at datetime(6),
    updated_at datetime(6),
    body varchar(4000) not null,
    event_key varchar(255) not null,
    id varchar(255) not null,
    subject varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications
CREATE TABLE notifications (
    is_read bit not null,
    created_at datetime(6),
    read_at datetime(6),
    body varchar(4000) not null,
    case_id varchar(255),
    event_key varchar(255) not null,
    id varchar(255) not null,
    recipient_id varchar(255) not null,
    subject varchar(255) not null,
    channel enum ('IN_APP','EMAIL','SMS'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payments
CREATE TABLE payments (
    amount decimal(38,2) not null,
    due_date date,
    tax_amount decimal(38,2),
    created_at datetime(6),
    paid_at datetime(6),
    version bigint,
    case_id varchar(255),
    customer_id varchar(255) not null,
    description varchar(255) not null,
    failure_reason varchar(255),
    id varchar(255) not null,
    invoice_number varchar(255) not null,
    provider_reference varchar(255),
    status enum ('PENDING','PAID','FAILED','REFUNDED','CANCELLED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: pricing_rules
CREATE TABLE pricing_rules (
    rule_value decimal(38,2) not null,
    updated_at datetime(6),
    description varchar(1000),
    code varchar(255) not null,
    id varchar(255) not null,
    label varchar(255) not null,
    updated_by varchar(255),
    value_type enum ('AMOUNT','PERCENT','HOURS') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: professional_types
CREATE TABLE professional_types (
    active bit not null,
    sort_order integer not null,
    code varchar(255) not null,
    designation varchar(255),
    id varchar(255) not null,
    label varchar(255) not null,
    regulator enum ('ICAI','BAR_COUNCIL','NONE'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: query_responses
CREATE TABLE query_responses (
    created_at datetime(6),
    message varchar(2000) not null,
    document_id varchar(255),
    id varchar(255) not null,
    query_id varchar(255) not null,
    responded_by_id varchar(255) not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tax_liabilities
CREATE TABLE tax_liabilities (
    amount decimal(38,2) not null,
    due_date date,
    assessment_year varchar(7),
    financial_year varchar(7) not null,
    created_at datetime(6) not null,
    updated_at datetime(6),
    notes varchar(2000),
    filing_case_id varchar(255),
    id varchar(255) not null,
    owner_id varchar(255) not null,
    period varchar(255),
    updated_by varchar(255),
    source enum ('FILING','MANUAL') not null,
    tax_type enum ('INCOME_TAX','GST') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tax_payments
CREATE TABLE tax_payments (
    amount decimal(38,2) not null,
    paid_on date,
    challan_number varchar(255),
    deductor_tan varchar(255),
    filing_id varchar(255) not null,
    id varchar(255) not null,
    type enum ('TDS','TCS','ADVANCE_TAX','SELF_ASSESSMENT_TAX') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tax_refunds
CREATE TABLE tax_refunds (
    amount_claimed decimal(38,2) not null,
    amount_received decimal(38,2) not null,
    claimed_on date,
    received_on date,
    assessment_year varchar(7),
    financial_year varchar(7) not null,
    created_at datetime(6) not null,
    updated_at datetime(6),
    notes varchar(2000),
    filing_case_id varchar(255),
    id varchar(255) not null,
    owner_id varchar(255) not null,
    reference_number varchar(255),
    updated_by varchar(255),
    status enum ('CLAIMED','PROCESSING','ISSUED','PARTIALLY_ISSUED','ADJUSTED','REJECTED') not null,
    tax_type enum ('INCOME_TAX','GST') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tax_returns
CREATE TABLE tax_returns (
    gross_salary float(53),
    refund_amount float(53),
    taxable_income float(53),
    tds_deducted float(53),
    total_income float(53),
    total_tax float(53),
    created_at datetime(6),
    updated_at datetime(6),
    additional_income_json TEXT,
    assessment_year varchar(255),
    financial_year varchar(255) not null,
    form16data_json TEXT,
    id varchar(255) not null,
    selected_regime varchar(255),
    tax_result_json TEXT,
    user_id varchar(255) not null,
    itr_type enum ('ITR_1','ITR_2','ITR_3','ITR_4'),
    status enum ('DRAFT','REVIEW','FILED','PROCESSED','REFUND_ISSUED'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: tax_rules
CREATE TABLE tax_rules (
    active bit not null,
    effective_from date not null,
    effective_to date,
    version integer not null,
    created_at datetime(6),
    updated_at datetime(6),
    approved_by varchar(255),
    configuration TEXT not null,
    created_by varchar(255),
    description varchar(255),
    id varchar(255) not null,
    rule_key varchar(255) not null,
    category enum ('SLABS','RATES','DEDUCTION_LIMITS','THRESHOLDS','DEADLINES','INTEREST_AND_FEES','RETURN_SCHEMA','VALIDATION') not null,
    tax_type enum ('INCOME_TAX','GST') not null,
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: taxpayer_profiles
CREATE TABLE taxpayer_profiles (
    date_of_birth date,
    metro_city bit not null,
    created_at datetime(6),
    updated_at datetime(6),
    version bigint,
    aadhaar_last_four varchar(255),
    address_line1 varchar(255),
    address_line2 varchar(255),
    bank_account_number varchar(255),
    bank_ifsc varchar(255),
    bank_name varchar(255),
    city varchar(255),
    id varchar(255) not null,
    pan varchar(255),
    pincode varchar(255),
    state varchar(255),
    user_id varchar(255) not null,
    taxpayer_type enum ('INDIVIDUAL','HUF','BUSINESS','PROFESSIONAL','OTHER'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: users
CREATE TABLE users (
    active bit not null,
    mfa_enabled bit not null,
    onboarding_complete bit not null,
    created_at datetime(6),
    last_login_at datetime(6),
    updated_at datetime(6),
    aadhaar varchar(255),
    email varchar(255),
    id varchar(255) not null,
    mfa_secret varchar(255),
    name varchar(255) not null,
    pan varchar(255),
    password varchar(255) not null,
    phone varchar(255),
    role enum ('USER','CONSULTANT','ADMIN','SUPER_ADMIN','TAX_PROFESSIONAL','GST_PROFESSIONAL','REVIEWER','DATA_ENTRY_OPERATOR','CUSTOMER_SUPPORT'),
    primary key (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Constraints and indexes
create index idx_audit_entity on audit_logs (entity_type, entity_id);
create index idx_audit_actor on audit_logs (actor_email);
create index idx_audit_created on audit_logs (created_at);
create index idx_event_case on case_events (case_id);
create index idx_tp_owner_fy on client_tax_payments (owner_id, financial_year);
create index idx_tp_status on client_tax_payments (verification_status);
alter table cms_entries add constraint UKcnqsjtpv7i0wv34h5s7xf2j03 unique (collection, slug);
create index idx_availability_consultant on consultant_availability (consultant_id);
alter table consultant_holidays add constraint UK5b1kgwcqkydywr2o1ghofbdk3 unique (consultant_id, holiday_date);
create index idx_payout_consultant on consultant_payouts (consultant_id);
alter table consultant_payouts add constraint UK_mw6lf67iurvklrtk7q3lie6kp unique (reference);
create index idx_consultant_status on consultant_profiles (status);
create index idx_consultant_type on consultant_profiles (professional_type_id);
create index idx_consultant_city on consultant_profiles (city);
alter table consultant_profiles add constraint UK_edxymbn5wxe19qtov8j1233o6 unique (user_id);
create index idx_review_consultant on consultant_reviews (consultant_id);
alter table consultant_reviews add constraint UK_8latciutfamm9mlc1qkabuah6 unique (booking_id);
create index idx_service_consultant on consultant_services (consultant_id);
create index idx_booking_client on consultation_bookings (client_id);
create index idx_booking_consultant on consultation_bookings (consultant_id);
create index idx_booking_start on consultation_bookings (scheduled_start);
create index idx_booking_status on consultation_bookings (status);
alter table consultation_bookings add constraint UK_2pc4v05206p9rl8crpayir42w unique (reference);
alter table consultation_categories add constraint UK_7tm6ukaxymbi4xabr3n9d5mnr unique (slug);
create index idx_message_booking on consultation_messages (booking_id);
alter table coupons add constraint UK_eplt0kkm9yf2of2lnx6c1oy9b unique (code);
create index idx_share_booking on document_shares (booking_id);
create index idx_share_document on document_shares (document_id);
create index idx_document_case on documents (case_id);
create index idx_document_owner on documents (owner_id);
create index idx_case_customer on filing_cases (customer_id);
create index idx_case_status on filing_cases (status);
create index idx_case_tax_type on filing_cases (tax_type);
create index idx_case_assignee on filing_cases (assigned_to_id);
alter table filing_cases add constraint UK_7ryg0b0c7vfeacdjwmitryglm unique (case_number);
create index idx_comment_case on filing_comments (case_id);
create index idx_query_case on filing_queries (case_id);
alter table filing_queries add constraint UK_oymhpdnjc2gxrgr2p540954mu unique (query_number);
alter table financial_years add constraint UK_bg75naxdmjhv21ex398pa120u unique (assessment_year);
alter table financial_years add constraint UK_hb12hfjgl3v4gj0lqd4o3gter unique (code);
alter table gst_filings add constraint UK_b4jh442g2ap198ns8katfbad4 unique (case_id);
create index idx_invoice_filing on gst_invoices (filing_id);
create index idx_invoice_number on gst_invoices (invoice_number);
create index idx_invoice_counterparty on gst_invoices (counterparty_gstin);
alter table gst_invoices add constraint uk_invoice_identity unique (filing_id, document_type, source, invoice_number, counterparty_gstin);
create index idx_gst_profile_gstin on gst_profiles (gstin);
alter table gst_profiles add constraint UK_ded3dci1sf7qupbdy0husm1xc unique (gstin);
create index idx_recon_filing on gst_reconciliation_entries (filing_id);
create index idx_recon_status on gst_reconciliation_entries (status);
alter table income_tax_filings add constraint UK_jrfps8nh7rp5eajg5q7qfmnva unique (case_id);
create index idx_inv_owner_fy on investments (owner_id, financial_year);
create index idx_inv_status on investments (verification_status);
alter table notification_templates add constraint UK_6ov5dqvi0691ubawglhmtmu4d unique (event_key);
create index idx_notification_recipient on notifications (recipient_id);
create index idx_payment_customer on payments (customer_id);
alter table payments add constraint UK_4bgtvbut8seryy8kitym8sfgq unique (invoice_number);
alter table pricing_rules add constraint UK_i6nhdgh8c9dc10pvt661unndt unique (code);
alter table professional_types add constraint UK_qxypueqhlnnndumdv4oqletu6 unique (code);
create index idx_tl_owner_fy on tax_liabilities (owner_id, financial_year);
create index idx_tr_owner_fy on tax_refunds (owner_id, financial_year);
create index idx_rule_key on tax_rules (rule_key);
create index idx_rule_tax_type on tax_rules (tax_type);
alter table tax_rules add constraint uk_rule_key_version unique (rule_key, version);
alter table taxpayer_profiles add constraint UK_b2rlec10ei7oucxdar8tg0397 unique (user_id);
alter table users add constraint UK_6dotkott2kjsp8vw4d0m25fb7 unique (email);
alter table users add constraint UK_eynn6fsc6tiakrei854umn1j9 unique (pan);
alter table case_events add constraint FKmekv6vya5ahg3d10gyxhxfnxq foreign key (actor_id) references users (id);
alter table case_events add constraint FKoogml4lyca8q8v5d70kohoqs3 foreign key (case_id) references filing_cases (id);
alter table client_tax_payments add constraint FK1exk7xmcgl62boqe2n44umge6 foreign key (owner_id) references users (id);
alter table consultant_availability add constraint FK7scehcqalntglsvt7ugk2wr1b foreign key (consultant_id) references consultant_profiles (id);
alter table consultant_holidays add constraint FKa73hude01vg8jkcnf0bkxedhx foreign key (consultant_id) references consultant_profiles (id);
alter table consultant_payouts add constraint FKl1vt1xjpltj7iyu24dqdhfbvd foreign key (consultant_id) references consultant_profiles (id);
alter table consultant_profiles add constraint FKhng9upjo6evb86ip4mwlx0hnm foreign key (professional_type_id) references professional_types (id);
alter table consultant_profiles add constraint FK3owgo4ne4t66ytyl9fqrbvfc1 foreign key (user_id) references users (id);
alter table consultant_reviews add constraint FKl3gxyjxa2mumqgp8y7jm7apni foreign key (booking_id) references consultation_bookings (id);
alter table consultant_reviews add constraint FKffr84gigmsxkudfhc4xkjukvt foreign key (client_id) references users (id);
alter table consultant_reviews add constraint FKk08dcq6hyaeaf2w2qbr7ttc2b foreign key (consultant_id) references consultant_profiles (id);
alter table consultant_services add constraint FKtkbaujln0v41ajrqeya5jh8kv foreign key (category_id) references consultation_categories (id);
alter table consultant_services add constraint FKq86n6x7rkmkkfbk88os8kbqk8 foreign key (consultant_id) references consultant_profiles (id);
alter table consultation_bookings add constraint FKdirjfnko4hbpcns8nwjvm2803 foreign key (category_id) references consultation_categories (id);
alter table consultation_bookings add constraint FKhara6h8d5boeqocobffvfohl3 foreign key (client_id) references users (id);
alter table consultation_bookings add constraint FKi7yf67ytr1sblur6itrqlsxa foreign key (consultant_id) references consultant_profiles (id);
alter table consultation_bookings add constraint FK1wdj1hnshvfv56l4oqtm57unk foreign key (payout_id) references consultant_payouts (id);
alter table consultation_bookings add constraint FKjp0digp2t2u49h3xmg7vdi7yn foreign key (service_id) references consultant_services (id);
alter table consultation_messages add constraint FKr0x78husqmjn0d8bk3y82tv11 foreign key (booking_id) references consultation_bookings (id);
alter table consultation_messages add constraint FK8a86icyta5qbv0ardg5hcq2s9 foreign key (sender_id) references users (id);
alter table deductions add constraint FKgap2b2rvddphbjnwxy4qvria4 foreign key (filing_id) references income_tax_filings (id);
alter table document_shares add constraint FKp0skm1nceubktohe62l01iw05 foreign key (booking_id) references consultation_bookings (id);
alter table document_shares add constraint FK2q6i3ymobf720h0xq3gdvhabn foreign key (document_id) references documents (id);
alter table document_shares add constraint FKifrnqt2vqfxmh4chs9whr6tjm foreign key (shared_by_id) references users (id);
alter table document_shares add constraint FKkgqudvy9yibycdw89nxhf0an0 foreign key (shared_with_id) references users (id);
alter table documents add constraint FK9aiu93kk3x4pn2xojr0kued6n foreign key (case_id) references filing_cases (id);
alter table documents add constraint FKoduxo6gl9tkyx39jo5kue60bq foreign key (owner_id) references users (id);
alter table documents add constraint FKbbk9dwrkdkweo5ae3jrf8d6kn foreign key (verified_by_id) references users (id);
alter table filing_cases add constraint FKhaxrp6wdtu1aahho0b4mme4l4 foreign key (assigned_to_id) references users (id);
alter table filing_cases add constraint FKqh5ysra262rbcuyqbo5sh72v6 foreign key (customer_id) references users (id);
alter table filing_comments add constraint FK1n9ickfx1uy484381d60x2a1v foreign key (author_id) references users (id);
alter table filing_comments add constraint FKbtid49kpwbdxu6cxs1sxujsa3 foreign key (case_id) references filing_cases (id);
alter table filing_queries add constraint FKhmbkpe2nixurlntuyc3wixvns foreign key (case_id) references filing_cases (id);
alter table filing_queries add constraint FKjefcte4ueymkjwum15fj618et foreign key (raised_by_id) references users (id);
alter table gst_filings add constraint FK5fcc9taj3cu34xlqr8kji4or4 foreign key (case_id) references filing_cases (id);
alter table gst_filings add constraint FKte35nx5ln0giai28ltvh9ixcb foreign key (gst_profile_id) references gst_profiles (id);
alter table gst_invoices add constraint FK66dsy0vvita8vhiwj98lxqbgd foreign key (filing_id) references gst_filings (id);
alter table gst_profiles add constraint FK8b84btjd1hlga6q3ubkol29c8 foreign key (user_id) references users (id);
alter table gst_reconciliation_entries add constraint FKq1hy3qk797be4pfcwa8y4cpdq foreign key (book_invoice_id) references gst_invoices (id);
alter table gst_reconciliation_entries add constraint FKmb9mumaxq2wu5fkwvvqp2p6vw foreign key (counterparty_invoice_id) references gst_invoices (id);
alter table gst_reconciliation_entries add constraint FK6woyfovv8xmwgdue9baula69c foreign key (filing_id) references gst_filings (id);
alter table income_sources add constraint FKjcfdv3yyxulvx6lw7efgikwvn foreign key (filing_id) references income_tax_filings (id);
alter table income_tax_filings add constraint FK9g3geb1clnur0l6jhj2bf2ksl foreign key (case_id) references filing_cases (id);
alter table investments add constraint FKkm16vgkc6pd5nttknioojgsvt foreign key (owner_id) references users (id);
alter table notifications add constraint FKqqnsjxlwleyjbxlmm213jaj3f foreign key (recipient_id) references users (id);
alter table payments add constraint FKd1qot1f3alweegm6ledjow6nj foreign key (customer_id) references users (id);
alter table payments add constraint FKt74rav064f37unm0rrupiq4fg foreign key (case_id) references filing_cases (id);
alter table query_responses add constraint FKe8g7xw51f865g4fh1a1ut5r8u foreign key (document_id) references documents (id);
alter table query_responses add constraint FKpe6yx81sx1fs2tpur0eym1pax foreign key (query_id) references filing_queries (id);
alter table query_responses add constraint FKd7lfu28begly2jvemk2ei0cec foreign key (responded_by_id) references users (id);
alter table tax_liabilities add constraint FK2yo9as466qa30dwvbmb98fkvt foreign key (owner_id) references users (id);
alter table tax_payments add constraint FKguxsxiwhhriw7y30s3fc5166n foreign key (filing_id) references income_tax_filings (id);
alter table tax_refunds add constraint FKhxok18tuejuqfbexy14o798qk foreign key (owner_id) references users (id);
alter table tax_returns add constraint FKdhqgg2s78bwvyggf3coesbj40 foreign key (user_id) references users (id);
alter table taxpayer_profiles add constraint FKgtulmcjbdiex01qgkltvvjj6e foreign key (user_id) references users (id);
