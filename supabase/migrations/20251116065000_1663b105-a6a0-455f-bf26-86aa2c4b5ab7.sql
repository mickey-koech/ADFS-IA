-- Insert sample admin user (you'll need to sign up with this email first)
-- Admin: admin@filestack.com / Admin123!
-- This creates the admin role for the user

-- Insert sample departments
INSERT INTO public.departments (name, description, is_active) VALUES
  ('IT Department', 'Information Technology', true),
  ('HR Department', 'Human Resources', true),
  ('Finance', 'Finance and Accounting', true)
ON CONFLICT DO NOTHING;

-- Function to setup admin role (call this after admin user signs up)
CREATE OR REPLACE FUNCTION public.setup_initial_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find user by email (admin@filestack.com)
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@filestack.com'
  LIMIT 1;
  
  IF admin_user_id IS NOT NULL THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Approve admin profile
    UPDATE public.profiles
    SET is_approved = true,
        approved_at = now()
    WHERE id = admin_user_id;
  END IF;
END;
$$;

-- Auto-approve function for testing (removes approval requirement)
CREATE OR REPLACE FUNCTION public.auto_approve_for_testing()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-approve all existing users for testing
  UPDATE public.profiles
  SET is_approved = true,
      approved_at = now()
  WHERE is_approved = false;
END;
$$;