-- Add impersonation tracking to activity_logs
-- This will help track when admins impersonate users for security and compliance

-- Create an enum for special action types
CREATE TYPE public.admin_action AS ENUM ('impersonate_start', 'impersonate_end');

-- Add impersonation columns to activity_logs if they don't exist
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS impersonated_user_id uuid,
ADD COLUMN IF NOT EXISTS session_token text;

-- Create index for impersonation queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_impersonation 
ON public.activity_logs(impersonated_user_id, created_at DESC)
WHERE impersonated_user_id IS NOT NULL;

-- Create function to log impersonation actions
CREATE OR REPLACE FUNCTION public.log_impersonation(
  _admin_id uuid,
  _target_user_id uuid,
  _action text,
  _session_token text DEFAULT NULL,
  _ip_address inet DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    impersonated_user_id,
    action,
    resource_type,
    resource_id,
    session_token,
    ip_address,
    metadata
  ) VALUES (
    _admin_id,
    _target_user_id,
    _action,
    'user_impersonation',
    _target_user_id,
    _session_token,
    _ip_address,
    jsonb_build_object(
      'admin_id', _admin_id,
      'target_user_id', _target_user_id,
      'timestamp', now()
    )
  );
END;
$$;