-- Fix security linter warnings by setting search_path on functions

-- Update handle_new_user function with search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$function$;

-- Update update_updated_at_column function with search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- Add indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS idx_files_duplicate_status ON public.files(duplicate_status) WHERE duplicate_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_ocr_status ON public.files(ocr_status);
CREATE INDEX IF NOT EXISTS idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_files_ai_tags ON public.files USING GIN(ai_suggested_tags);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_alerts_resolved ON public.anomaly_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_file_predictions_user_id ON public.file_predictions(user_id);

-- Add helpful RLS policy for file_predictions
CREATE POLICY "Users can update their own predictions"
ON public.file_predictions
FOR UPDATE
USING (user_id = auth.uid());