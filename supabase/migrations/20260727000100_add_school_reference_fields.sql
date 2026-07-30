ALTER TABLE student_education
  ADD COLUMN IF NOT EXISTS school_name text,
  ADD COLUMN IF NOT EXISTS school_board text,
  ADD COLUMN IF NOT EXISTS board_major_subject text,
  ADD COLUMN IF NOT EXISTS board_subject_percentage decimal(5,2);
