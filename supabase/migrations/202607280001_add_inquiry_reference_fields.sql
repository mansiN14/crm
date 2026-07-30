ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS reference_source text CHECK (reference_source IN ('earlier_student', 'bni', 'outside')),
  ADD COLUMN IF NOT EXISTS reference_name text;
