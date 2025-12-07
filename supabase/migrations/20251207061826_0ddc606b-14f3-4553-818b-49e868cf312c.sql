-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view profiles with restricted email access" ON public.profiles;

-- Create a simpler, non-recursive SELECT policy
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin')
);

-- Create a separate policy for approved users in same department (without recursion)
CREATE POLICY "Approved users can view same department profiles"
ON public.profiles
FOR SELECT
USING (
  is_approved = true 
  AND department_id IS NOT NULL 
  AND department_id = (
    SELECT p.department_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid()
    LIMIT 1
  )
);