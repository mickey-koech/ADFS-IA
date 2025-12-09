-- Drop all existing SELECT policies on profiles to fix the RESTRICTIVE issue
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Approved users can view same department profiles" ON public.profiles;

-- Create a single PERMISSIVE SELECT policy that properly allows admins to see all profiles
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin')
  OR (
    is_approved = true 
    AND department_id IS NOT NULL 
    AND department_id = (
      SELECT p.department_id 
      FROM public.profiles p 
      WHERE p.id = auth.uid()
      LIMIT 1
    )
  )
);