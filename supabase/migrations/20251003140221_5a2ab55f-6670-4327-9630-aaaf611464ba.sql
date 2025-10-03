-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'secretary', 'viewer');

-- Create enum for OCR status
CREATE TYPE public.ocr_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- Create enum for duplicate status  
CREATE TYPE public.duplicate_status AS ENUM ('suggested', 'confirmed', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create files table with AI fields for Phase 2
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  checksum TEXT,
  
  -- User tracking
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Organization
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  folders TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Versioning
  version INTEGER NOT NULL DEFAULT 1,
  parent_file_id UUID REFERENCES public.files(id),
  
  -- Soft delete and archive
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ,
  
  -- AI fields (Phase 2 ready)
  ocr_text TEXT,
  ocr_status ocr_status DEFAULT 'pending',
  language TEXT,
  content_hash TEXT,
  embedding_id TEXT,
  similarity_score DECIMAL(5,4),
  duplicate_of UUID[] DEFAULT ARRAY[]::UUID[],
  duplicate_status duplicate_status,
  ai_suggested_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ai_confidence DECIMAL(5,4),
  ai_last_scanned_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create file versions tracking table
CREATE TABLE public.file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT NOT NULL,
  checksum TEXT,
  UNIQUE(file_id, version)
);

-- Create AI feedback table (Phase 2 ready)
CREATE TABLE public.ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('accept', 'reject', 'merge', 'archive')),
  target_file_id UUID REFERENCES public.files(id),
  reason TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_files_uploaded_by ON public.files(uploaded_by);
CREATE INDEX idx_files_uploaded_at ON public.files(uploaded_at);
CREATE INDEX idx_files_tags ON public.files USING GIN(tags);
CREATE INDEX idx_files_folders ON public.files USING GIN(folders);
CREATE INDEX idx_files_is_deleted ON public.files(is_deleted);
CREATE INDEX idx_files_content_hash ON public.files(content_hash);
CREATE INDEX idx_files_ocr_status ON public.files(ocr_status);
CREATE INDEX idx_files_duplicate_status ON public.files(duplicate_status);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for files
CREATE POLICY "Users can view non-deleted files"
  ON public.files FOR SELECT
  TO authenticated
  USING (is_deleted = false OR uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can upload files"
  ON public.files FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update own files or admins/secretaries can update any"
  ON public.files FOR UPDATE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR 
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'secretary')
  );

CREATE POLICY "Only admins can delete files"
  ON public.files FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for file_versions
CREATE POLICY "Users can view file versions"
  ON public.file_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.id = file_versions.file_id
      AND (files.is_deleted = false OR files.uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "System can insert file versions"
  ON public.file_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for ai_feedback
CREATE POLICY "Users can view own feedback"
  ON public.ai_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own feedback"
  ON public.ai_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  false,
  104857600, -- 100MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain']
);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view files they have access to"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'files' AND
    EXISTS (
      SELECT 1 FROM public.files
      WHERE files.storage_path = storage.objects.name
      AND (files.is_deleted = false OR files.uploaded_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Admins can delete storage files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'files' AND public.has_role(auth.uid(), 'admin'));