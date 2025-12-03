-- Drop existing permissive INSERT policies
DROP POLICY IF EXISTS "System can insert activity logs" ON public.activity_logs;
DROP POLICY IF EXISTS "System can insert file versions" ON public.file_versions;
DROP POLICY IF EXISTS "System can insert anomaly alerts" ON public.anomaly_alerts;
DROP POLICY IF EXISTS "System can manage predictions" ON public.file_predictions;

-- Create tightened INSERT policies for activity_logs
CREATE POLICY "Authenticated users can log own actions"
ON public.activity_logs
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Create tightened INSERT policies for file_versions  
CREATE POLICY "Users can create versions for own files"
ON public.file_versions
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.files 
    WHERE files.id = file_versions.file_id 
    AND (files.uploaded_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

-- Create tightened INSERT policies for anomaly_alerts
CREATE POLICY "Only admins can insert anomaly alerts"
ON public.anomaly_alerts
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create tightened policies for file_predictions
CREATE POLICY "Authenticated users can manage own predictions"
ON public.file_predictions
FOR ALL
USING (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role)
);

-- Fix profiles RLS policy to restrict email visibility
DROP POLICY IF EXISTS "Users can view approved profiles" ON public.profiles;

CREATE POLICY "Users can view profiles with restricted email access"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    is_approved = true 
    AND department_id IS NOT NULL 
    AND department_id IN (
      SELECT department_id FROM public.profiles WHERE id = auth.uid()
    )
  )
);

-- Enable realtime for anomaly_alerts for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.anomaly_alerts;