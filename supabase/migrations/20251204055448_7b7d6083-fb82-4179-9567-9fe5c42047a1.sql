-- Create department messages table for chat
CREATE TABLE public.department_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.department_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their department
CREATE POLICY "Users can view messages in their department"
ON public.department_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.department_id = department_messages.department_id
    AND profiles.is_approved = true
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Users can send messages in their department
CREATE POLICY "Users can send messages in their department"
ON public.department_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.department_id = department_messages.department_id
    AND profiles.is_approved = true
  )
);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
ON public.department_messages FOR DELETE
USING (sender_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_department_messages_department ON public.department_messages(department_id);
CREATE INDEX idx_department_messages_created ON public.department_messages(created_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.department_messages;