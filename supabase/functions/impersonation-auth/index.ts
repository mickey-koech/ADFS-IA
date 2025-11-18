import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: hasAdminRole } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!hasAdminRole) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, targetUserId } = await req.json();

    if (action === 'start') {
      // Generate a secure session token
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Log impersonation start
      await supabaseAdmin.rpc('log_impersonation', {
        _admin_id: user.id,
        _target_user_id: targetUserId,
        _action: 'impersonate_start',
        _session_token: sessionToken
      });

      // Set httpOnly cookie
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'application/json');
      headers.set(
        'Set-Cookie',
        `impersonation_token=${sessionToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`
      );
      headers.append(
        'Set-Cookie',
        `impersonation_admin=${user.id}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`
      );
      headers.append(
        'Set-Cookie',
        `impersonation_target=${targetUserId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`
      );
      headers.append(
        'Set-Cookie',
        `impersonation_expires=${expiresAt.getTime()}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1800`
      );

      return new Response(
        JSON.stringify({ success: true, expiresAt }),
        { status: 200, headers }
      );
    } else if (action === 'end') {
      // Get session token from cookie
      const cookies = req.headers.get('Cookie') || '';
      const sessionToken = cookies.split(';').find(c => c.trim().startsWith('impersonation_token='))?.split('=')[1];

      if (sessionToken) {
        // Log impersonation end
        await supabaseAdmin.rpc('log_impersonation', {
          _admin_id: user.id,
          _target_user_id: targetUserId,
          _action: 'impersonate_end',
          _session_token: sessionToken
        });
      }

      // Clear cookies
      const headers = new Headers(corsHeaders);
      headers.set('Content-Type', 'application/json');
      headers.set(
        'Set-Cookie',
        'impersonation_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      );
      headers.append(
        'Set-Cookie',
        'impersonation_admin=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      );
      headers.append(
        'Set-Cookie',
        'impersonation_target=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      );
      headers.append(
        'Set-Cookie',
        'impersonation_expires=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'
      );

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
