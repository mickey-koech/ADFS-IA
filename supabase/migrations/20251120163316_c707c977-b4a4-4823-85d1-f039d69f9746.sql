-- Fix security definer view by recreating without elevated privileges
-- The view should respect the calling user's permissions, not execute with elevated rights

DROP VIEW IF EXISTS public.profiles_safe;

-- Create view without SECURITY DEFINER (will use invoker's rights by default)
CREATE VIEW public.profiles_safe 
WITH (security_invoker = true)
AS
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
FROM public.profiles
WHERE is_approved = true OR id = auth.uid() OR has_role(auth.uid(), 'admin');

-- Grant access to the view
GRANT SELECT ON public.profiles_safe TO authenticated;