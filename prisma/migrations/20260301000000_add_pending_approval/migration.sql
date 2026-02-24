-- Step 1: Add enum value only (must be committed before use in PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'LessonStatus' AND e.enumlabel = 'pending_approval'
  ) THEN
    ALTER TYPE "LessonStatus" ADD VALUE 'pending_approval';
  END IF;
END
$$;
