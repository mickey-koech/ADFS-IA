import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user is authenticated and has admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !userRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    
    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Check for mass deletions (>20 files in 10 minutes)
    
    const { data: recentDeletions, error: deletionError } = await supabaseAdmin
      .from('activity_logs')
      .select('user_id, action, created_at')
      .eq('action', 'file_deleted')
      .gte('created_at', tenMinutesAgo.toISOString());
    
    
    if (recentDeletions && recentDeletions.length > 20) {
      await supabaseAdmin.from('anomaly_alerts').insert({
        alert_type: 'mass_deletion',
        severity: 'critical',
        description: `Unusual activity detected: ${recentDeletions.length} files deleted in 10 minutes`,
        metadata: { count: recentDeletions.length, userId: recentDeletions[0].user_id }
      });
    }
    
    // Check for unusual upload patterns (>50 files in 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const { data: recentUploads, error: uploadError } = await supabaseAdmin
      .from('files')
      .select('uploaded_by, uploaded_at')
      .gte('uploaded_at', oneHourAgo.toISOString());
    
    if (uploadError) throw uploadError;
    
    if (recentUploads && recentUploads.length > 50) {
      await supabaseAdmin.from('anomaly_alerts').insert({
        alert_type: 'mass_upload',
        severity: 'medium',
        description: `High volume upload detected: ${recentUploads.length} files in 1 hour`,
        metadata: { count: recentUploads.length }
      });
    }
    
    // Check for unauthorized access attempts
    const { data: failedAccess, error: accessError } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('action', 'access_denied')
      .gte('created_at', oneHourAgo.toISOString());
    
    if (accessError) throw accessError;
    
    if (failedAccess && failedAccess.length > 10) {
      await supabaseAdmin.from('anomaly_alerts').insert({
        alert_type: 'unauthorized_access',
        severity: 'high',
        description: `Multiple unauthorized access attempts: ${failedAccess.length} in 1 hour`,
        metadata: { count: failedAccess.length }
      });
    }
    
    // Get recent unresolved alerts
    const { data: alerts } = await supabaseAdmin
      .from('anomaly_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return new Response(
      JSON.stringify({ alerts: alerts || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Anomaly detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});