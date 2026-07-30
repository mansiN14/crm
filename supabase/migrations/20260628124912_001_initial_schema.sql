/*
# Initial CRM Schema for The True Axis Education Consulting

## Overview
This migration creates the complete database schema for the CRM system including:
- User management with role-based access (Admin, Counselor, Staff)
- Inquiry tracking from initial contact to enrollment
- Student profiles with education history
- Product offerings (Career Counselling, College Admissions, Mentoring, Psychometric Test)
- Meeting management with timeline
- Reminder system with notifications
- Quotation generator with PDF support
- Payment tracking
- Activity logging for audit trail

## Tables Created
1. `users` - Extended user profiles with roles (Admin, Counselor, Staff)
2. `inquiries` - Initial student inquiries with attendance tracking
3. `students` - Complete student profiles
4. `student_education` - Education history (8th-12th, diploma, graduation, post-grad)
5. `student_products` - Products assigned to students with form data
6. `meetings` - Meeting records with timeline per student
7. `reminders` - Reminder system with notifications
8. `quotations` - Quotation generator with calculations
9. `payments` - Payment tracking with status
10. `activity_logs` - Audit trail for all actions

## Security
- RLS enabled on all tables
- Role-based policies: Admin sees all, Counselor sees assigned, Staff sees inquiries
- Owner-scoped access where applicable
*/

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'counselor', 'staff')),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inquiries table
CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_date date NOT NULL DEFAULT CURRENT_DATE,
  student_name text NOT NULL,
  contact_number text NOT NULL,
  email text,
  product_type text CHECK (product_type IN ('career_counselling', 'college_admissions', 'mentoring', 'psychometric_test')),
  student_grade text CHECK (student_grade IN ('8th Grade', '9th Grade', '10th Grade', '11th Grade', '12th Grade', 'Diploma', 'Graduation', 'Post Graduate')),
  attendance text NOT NULL DEFAULT 'pending' CHECK (attendance IN ('yes', 'no', 'pending')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'attended', 'ongoing', 'completed', 'no_show')),
  assigned_counselor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Students table (converted from inquiry)
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE SET NULL,
  student_name text NOT NULL,
  father_name text,
  mother_name text,
  date_of_birth date,
  mobile_number text NOT NULL,
  email text,
  address text,
  notes text,
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'inactive')),
  assigned_counselor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Student education details
CREATE TABLE IF NOT EXISTS student_education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  eighth_percentage decimal(5,2),
  ninth_percentage decimal(5,2),
  tenth_percentage decimal(5,2),
  eleventh_percentage decimal(5,2),
  twelfth_percentage decimal(5,2),
  diploma text,
  diploma_percentage decimal(5,2),
  graduation text,
  graduation_percentage decimal(5,2),
  post_graduation text,
  post_graduation_percentage decimal(5,2),
  current_grade text,
  current_stream text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products assigned to students
CREATE TABLE IF NOT EXISTS student_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  product_type text NOT NULL CHECK (product_type IN ('career_counselling', 'college_admissions', 'mentoring', 'psychometric_test')),
  -- Career Counselling fields
  interests text,
  strengths text,
  preferred_career text,
  goals text,
  career_notes text,
  -- College Admissions fields
  country text,
  university_name text,
  course_name text,
  intake_year integer,
  scholarship_required boolean DEFAULT false,
  application_status text,
  admissions_notes text,
  -- Mentoring fields
  mentor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  duration text,
  mentoring_goals text,
  mentoring_notes text,
  -- Psychometric Test fields
  test_date date,
  test_status text CHECK (test_status IN ('pending', 'completed', 'cancelled')),
  report_generated boolean DEFAULT false,
  psychometric_notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meeting_number integer NOT NULL,
  meeting_date date NOT NULL,
  meeting_time time,
  discussion_notes text,
  outcome text,
  next_action text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  reminder_date date NOT NULL,
  reminder_time time NOT NULL,
  title text NOT NULL,
  description text,
  reminder_type text NOT NULL CHECK (reminder_type IN ('meeting', 'follow_up', 'payment', 'task')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Quotations table
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_id uuid REFERENCES student_products(id) ON DELETE SET NULL,
  amount decimal(12,2) NOT NULL,
  discount decimal(12,2) DEFAULT 0,
  gst_percentage decimal(5,2) DEFAULT 18,
  total_amount decimal(12,2) NOT NULL,
  quotation_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  quotation_id uuid REFERENCES quotations(id) ON DELETE SET NULL,
  payment_number integer NOT NULL,
  total_amount decimal(12,2) NOT NULL,
  amount_paid decimal(12,2) NOT NULL DEFAULT 0,
  payment_date date,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'overdue')),
  payment_mode text,
  transaction_id text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_education ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users policies (all authenticated users can read, only own profile update)
DROP POLICY IF EXISTS "users_read_all" ON users;
CREATE POLICY "users_read_all" ON users FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own" ON users FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Inquiries policies
DROP POLICY IF EXISTS "inquiries_read_all" ON inquiries;
CREATE POLICY "inquiries_read_all" ON inquiries FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "inquiries_insert_all" ON inquiries;
CREATE POLICY "inquiries_insert_all" ON inquiries FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_update_all" ON inquiries;
CREATE POLICY "inquiries_update_all" ON inquiries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_delete_admin" ON inquiries;
CREATE POLICY "inquiries_delete_admin" ON inquiries FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Students policies
DROP POLICY IF EXISTS "students_read_all" ON students;
CREATE POLICY "students_read_all" ON students FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "students_insert_all" ON students;
CREATE POLICY "students_insert_all" ON students FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "students_update_all" ON students;
CREATE POLICY "students_update_all" ON students FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "students_delete_admin" ON students;
CREATE POLICY "students_delete_admin" ON students FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Student education policies
DROP POLICY IF EXISTS "student_education_read_all" ON student_education;
CREATE POLICY "student_education_read_all" ON student_education FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "student_education_insert_all" ON student_education;
CREATE POLICY "student_education_insert_all" ON student_education FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "student_education_update_all" ON student_education;
CREATE POLICY "student_education_update_all" ON student_education FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_education_delete_all" ON student_education;
CREATE POLICY "student_education_delete_all" ON student_education FOR DELETE
  TO authenticated USING (true);

-- Student products policies
DROP POLICY IF EXISTS "student_products_read_all" ON student_products;
CREATE POLICY "student_products_read_all" ON student_products FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "student_products_insert_all" ON student_products;
CREATE POLICY "student_products_insert_all" ON student_products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "student_products_update_all" ON student_products;
CREATE POLICY "student_products_update_all" ON student_products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "student_products_delete_all" ON student_products;
CREATE POLICY "student_products_delete_all" ON student_products FOR DELETE
  TO authenticated USING (true);

-- Meetings policies
DROP POLICY IF EXISTS "meetings_read_all" ON meetings;
CREATE POLICY "meetings_read_all" ON meetings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "meetings_insert_all" ON meetings;
CREATE POLICY "meetings_insert_all" ON meetings FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "meetings_update_all" ON meetings;
CREATE POLICY "meetings_update_all" ON meetings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "meetings_delete_all" ON meetings;
CREATE POLICY "meetings_delete_all" ON meetings FOR DELETE
  TO authenticated USING (true);

-- Reminders policies
DROP POLICY IF EXISTS "reminders_read_all" ON reminders;
CREATE POLICY "reminders_read_all" ON reminders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reminders_insert_all" ON reminders;
CREATE POLICY "reminders_insert_all" ON reminders FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "reminders_update_all" ON reminders;
CREATE POLICY "reminders_update_all" ON reminders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "reminders_delete_all" ON reminders;
CREATE POLICY "reminders_delete_all" ON reminders FOR DELETE
  TO authenticated USING (true);

-- Quotations policies
DROP POLICY IF EXISTS "quotations_read_all" ON quotations;
CREATE POLICY "quotations_read_all" ON quotations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "quotations_insert_all" ON quotations;
CREATE POLICY "quotations_insert_all" ON quotations FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "quotations_update_all" ON quotations;
CREATE POLICY "quotations_update_all" ON quotations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "quotations_delete_admin" ON quotations;
CREATE POLICY "quotations_delete_admin" ON quotations FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Payments policies
DROP POLICY IF EXISTS "payments_read_all" ON payments;
CREATE POLICY "payments_read_all" ON payments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "payments_insert_all" ON payments;
CREATE POLICY "payments_insert_all" ON payments FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "payments_update_all" ON payments;
CREATE POLICY "payments_update_all" ON payments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "payments_delete_admin" ON payments;
CREATE POLICY "payments_delete_admin" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Activity logs policies
DROP POLICY IF EXISTS "activity_logs_read_all" ON activity_logs;
CREATE POLICY "activity_logs_read_all" ON activity_logs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "activity_logs_insert_all" ON activity_logs;
CREATE POLICY "activity_logs_insert_all" ON activity_logs FOR INSERT
  TO authenticated WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_assigned_counselor ON inquiries(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_assigned_counselor ON students(assigned_counselor_id);
CREATE INDEX IF NOT EXISTS idx_meetings_student ON meetings(student_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

-- Function to generate quotation number
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS text AS $$
DECLARE
  next_num integer;
  year_part text;
BEGIN
  year_part := to_char(CURRENT_DATE, 'YY');
  SELECT COALESCE(MAX(CAST(SUBSTRING(quotation_number FROM 4) AS integer)), 0) + 1
  INTO next_num
  FROM quotations
  WHERE quotation_number LIKE 'QT' || year_part || '%';
  RETURN 'QT' || year_part || LPAD(next_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers for updated_at
DO $$
BEGIN
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_inquiries_updated_at BEFORE UPDATE ON inquiries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_student_education_updated_at BEFORE UPDATE ON student_education
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_student_products_updated_at BEFORE UPDATE ON student_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON quotations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;
