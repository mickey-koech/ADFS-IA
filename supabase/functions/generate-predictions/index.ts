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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId } = await req.json();
    
    // Verify user can only get predictions for themselves (unless admin)
    if (userId !== user.id) {
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!userRole) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Can only access own predictions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    // Get user's file access patterns from activity logs
    const { data: recentActivity, error: activityError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .eq('action', 'file_viewed')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (activityError) throw activityError;
    
    // Analyze patterns with AI
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const hour = new Date().getHours();
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Based on user activity patterns (day: ${dayOfWeek}, hour: ${hour}), recent file accesses: ${JSON.stringify(recentActivity?.slice(0, 10))}, predict which types of files the user might need. Return JSON array of predictions with: {type, confidence, reason}`
        }],
        tools: [{
          type: 'function',
          name: 'predict_needed_files',
          parameters: {
            type: 'object',
            properties: {
              predictions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    confidence: { type: 'number' },
                    reason: { type: 'string' }
                  }
                }
              }
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'predict_needed_files' } }
      }),
    });
    
    const aiResult = await aiResponse.json();
    
    // Validate AI response structure
    if (!aiResult?.choices?.[0]?.message?.tool_calls?.[0]) {
      console.log('No predictions generated from AI:', aiResult);
      return new Response(
        JSON.stringify({ predictions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const toolCall = aiResult.choices[0].message.tool_calls[0];
    const predictions = JSON.parse(toolCall.function.arguments).predictions || [];
    
    // Get matching files for each prediction
    const recommendedFiles = [];
    
    for (const pred of predictions.slice(0, 3)) {
      const { data: matchingFiles } = await supabase
        .from('files')
        .select('*')
        .ilike('original_name', `%${pred.type}%`)
        .eq('is_deleted', false)
        .limit(2);
      
      if (matchingFiles && matchingFiles.length > 0) {
        for (const file of matchingFiles) {
          recommendedFiles.push({
            fileId: file.id,
            predictionType: pred.type,
            confidence: pred.confidence,
            reason: pred.reason
          });
          
          // Store prediction
          await supabase.from('file_predictions').insert({
            user_id: userId,
            file_id: file.id,
            prediction_type: pred.type,
            confidence: pred.confidence,
            reason: pred.reason,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
    }
    
    return new Response(
      JSON.stringify({ predictions: recommendedFiles }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Prediction generation error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred while generating predictions' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});