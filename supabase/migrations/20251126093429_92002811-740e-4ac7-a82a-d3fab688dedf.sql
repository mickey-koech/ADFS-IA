-- Enable realtime for activity_logs table
ALTER TABLE activity_logs REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;