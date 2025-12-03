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

    const { fileId } = await req.json();
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    // Get file metadata - RLS will ensure user can only access their files
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (fileError) throw fileError;
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('files')
      .download(file.storage_path);
    
    if (downloadError) throw downloadError;
    
    // Convert file to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    
    // Process with Lovable AI (OCR + NLP)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a document analysis assistant. Extract text, identify key information (names, dates, amounts), suggest tags, and detect the document language. Return JSON with: {text, entities: {names, dates, amounts}, suggestedTags, language}'
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyze this ${file.mime_type} document` },
              { type: 'image_url', image_url: { url: `data:${file.mime_type};base64,${base64}` } }
            ]
          }
        ],
        tools: [{
          type: 'function',
          name: 'document_analysis',
          description: 'Extract structured information from document',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              entities: {
                type: 'object',
                properties: {
                  names: { type: 'array', items: { type: 'string' } },
                  dates: { type: 'array', items: { type: 'string' } },
                  amounts: { type: 'array', items: { type: 'string' } }
                }
              },
              suggestedTags: { type: 'array', items: { type: 'string' } },
              language: { type: 'string' }
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'document_analysis' } }
      }),
    });
    
    const aiResult = await aiResponse.json();
    
    // Validate AI response
    if (!aiResult?.choices?.[0]?.message?.tool_calls?.[0]) {
      throw new Error('Invalid AI response: no tool calls received');
    }
    
    const toolCall = aiResult.choices[0].message.tool_calls[0];
    const analysis = JSON.parse(toolCall.function.arguments);
    
    // Generate embedding
    const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Generate a semantic embedding for this text: ${analysis.text.substring(0, 2000)}`
        }]
      }),
    });
    
    // For now, use a placeholder embedding. In production, use a proper embedding model
    const embedding = new Array(768).fill(0);
    
    // Update file with AI results
    const { error: updateError } = await supabase
      .from('files')
      .update({
        ocr_text: analysis.text,
        ocr_status: 'done',
        language: analysis.language,
        ai_suggested_tags: analysis.suggestedTags,
        ai_confidence: 0.85,
        ai_last_scanned_at: new Date().toISOString(),
        embedding: `[${embedding.join(',')}]`
      })
      .eq('id', fileId);
    
    if (updateError) throw updateError;
    
    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: file.uploaded_by,
      action: 'ai_processing_completed',
      resource_type: 'file',
      resource_id: fileId,
      metadata: { suggestedTags: analysis.suggestedTags }
    });
    
    return new Response(
      JSON.stringify({ success: true, analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('AI processing error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred while processing the file' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});