// Row shapes for the Supabase-native portal tables (no generated DB types;
// keep in sync with supabase/migrations/*_portal_schema.sql).
export type PortalProfile = {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "financial_officer" | "monitor_evaluator" | "student";
};

export type PortalPayment = {
  id: string;
  student_id: string;
  amount: number | string;
  type: string;
  status: string;
  method: string | null;
  reference: string | null;
  disbursement_date: string | null;
  payment_method: string | null;
  transaction_reference: string | null;
  approved_by: string | null;
  created_at: string;
};

export type PortalDocument = {
  id: string;
  student_id: string;
  type: string;
  file_url: string;
  status: string;
  verified: boolean;
  created_at: string;
};

export type PortalAccount = {
  id: string;
  name: string;
  kind: string;
  contact_person: string | null;
  contact_phone: string | null;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  paybill_number: string | null;
  verified: boolean;
  last_payment_date: string | null;
};

export type PortalResource = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};
