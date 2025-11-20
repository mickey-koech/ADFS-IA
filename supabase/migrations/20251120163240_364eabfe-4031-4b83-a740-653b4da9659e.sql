-- Add comment noting email visibility should be handled at application level
-- PostgreSQL RLS operates at row-level, not column-level
-- Application code should only display email addresses to:
-- 1. The user themselves (auth.uid() = profiles.id)
-- 2. Admin users (has_role(auth.uid(), 'admin'))

COMMENT ON COLUMN public.profiles.email IS 
'Sensitive PII - Application layer should only display this to the profile owner or admins';

-- Optional: Create a helper view that conditionally shows emails
CREATE OR REPLACE VIEW public.profiles_safe AS
SELECT 
  id,
  full_name,
  CASE 
    WHEN id = auth.uid() OR has_role(auth.uid(), 'admin') THEN email
    ELSE NULL
  END as email,
  department_id,
  is_approved,
  approved_by,
  approved_at,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;