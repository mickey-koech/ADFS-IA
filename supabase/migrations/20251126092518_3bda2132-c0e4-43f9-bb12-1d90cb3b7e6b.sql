-- Assign admin role to admin@filestack.com user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Find the admin@filestack.com user
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
    
    RAISE NOTICE 'Admin role assigned to admin@filestack.com';
  ELSE
    RAISE NOTICE 'User admin@filestack.com not found';
  END IF;
END $$;