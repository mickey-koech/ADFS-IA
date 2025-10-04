-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector column to files table for embeddings
ALTER TABLE public.files 
ADD COLUMN embedding vector(768);

-- Create index for vector similarity search
CREATE INDEX files_embedding_idx ON public.files 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create activity log table for anomaly detection
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_user_id_idx ON public.activity_logs(user_id);
CREATE INDEX activity_logs_created_at_idx ON public.activity_logs(created_at DESC);
CREATE INDEX activity_logs_action_idx ON public.activity_logs(action);

-- Enable RLS on activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (true);

-- Create predictive recommendations table
CREATE TABLE public.file_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  prediction_type text NOT NULL,
  confidence numeric(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  reason text,
  shown_at timestamptz,
  interacted_at timestamptz,
  was_helpful boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX file_predictions_user_id_idx ON public.file_predictions(user_id);
CREATE INDEX file_predictions_expires_at_idx ON public.file_predictions(expires_at);

-- Enable RLS on file_predictions
ALTER TABLE public.file_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own predictions"
ON public.file_predictions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage predictions"
ON public.file_predictions FOR ALL
USING (true);

-- Create anomaly alerts table
CREATE TABLE public.anomaly_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean DEFAULT false,
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX anomaly_alerts_created_at_idx ON public.anomaly_alerts(created_at DESC);
CREATE INDEX anomaly_alerts_resolved_idx ON public.anomaly_alerts(resolved);

-- Enable RLS on anomaly_alerts
ALTER TABLE public.anomaly_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all anomaly alerts"
ON public.anomaly_alerts FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert anomaly alerts"
ON public.anomaly_alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update anomaly alerts"
ON public.anomaly_alerts FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));