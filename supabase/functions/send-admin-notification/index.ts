import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'user_approved' | 'user_rejected' | 'role_changed';
  userId: string;
  performedBy: string;
  details?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { type, userId, performedBy, details }: NotificationRequest = await req.json();

    // Get user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    // Get admin email
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', performedBy)
      .single();

    // Here you would integrate with Resend or another email service
    // For now, we'll just log the action
    console.log('Admin notification:', {
      type,
      userEmail: profile?.email,
      userName: profile?.full_name,
      adminEmail: adminProfile?.email,
      details,
    });

    // TODO: Integrate with Resend
    // const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    // await resend.emails.send({
    //   from: "Digital Filing <notifications@yourdomain.com>",
    //   to: [adminProfile?.email],
    //   subject: `User ${type.replace('_', ' ')}`,
    //   html: `<p>Action: ${type}</p><p>User: ${profile?.full_name} (${profile?.email})</p>`,
    // });

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
