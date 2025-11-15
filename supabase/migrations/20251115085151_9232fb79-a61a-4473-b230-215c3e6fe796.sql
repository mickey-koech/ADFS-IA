-- Add departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Departments policies
CREATE POLICY "Anyone can view active departments"
ON public.departments
FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage departments"
ON public.departments
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Add approval and department fields to profiles
ALTER TABLE public.profiles
ADD COLUMN is_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN department_id UUID REFERENCES public.departments(id),
ADD COLUMN approved_by UUID REFERENCES auth.users(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Update profiles RLS to check approval status
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view approved profiles"
ON public.profiles
FOR SELECT
USING (is_approved = true OR auth.uid() = id OR has_role(auth.uid(), 'admin'));

-- Admins can update any profile for approval
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Add trigger for departments updated_at
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON public.departments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default departments
INSERT INTO public.departments (name, description) VALUES
('General', 'General department for all users'),
('Administration', 'Administrative department'),
('Finance', 'Finance and accounting department'),
('Operations', 'Operations and logistics department'),
('IT', 'Information Technology department');

-- Create function to approve user
CREATE OR REPLACE FUNCTION public.approve_user(
  user_id_to_approve UUID,
  dept_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can approve users
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;

  UPDATE public.profiles
  SET 
    is_approved = true,
    approved_by = auth.uid(),
    approved_at = now(),
    department_id = dept_id
  WHERE id = user_id_to_approve;
END;
$$;