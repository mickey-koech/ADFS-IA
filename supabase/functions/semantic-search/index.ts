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

    const { query } = await req.json();
    
    // Input validation
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid query parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Stricter input validation: allow only alphanumeric, spaces, and basic punctuation
    const sanitizedQuery = query
      .trim()
      .slice(0, 200)
      .replace(/[^a-zA-Z0-9\s.,'-]/g, '');
    
    if (sanitizedQuery.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Query too short or contains invalid characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    // Perform safe text search - RLS will filter results automatically
    const searchPattern = `%${sanitizedQuery}%`;
    
    const { data: textResults, error: searchError } = await supabase
      .from('files')
      .select('*')
      .eq('is_deleted', false)
      .or(`original_name.ilike."${searchPattern}",ocr_text.ilike."${searchPattern}"`)
      .order('uploaded_at', { ascending: false })
      .limit(20);
    
    if (searchError) throw searchError;
    
    // Use AI to rank and enhance results
    if (textResults && textResults.length > 0) {
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
            content: `Rank these ${textResults.length} search results for query "${sanitizedQuery}" and assign relevance scores (0-1). Files: ${JSON.stringify(textResults.map(f => ({ id: f.id, name: f.original_name, tags: f.tags })))}`
          }],
          tools: [{
            type: 'function',
            name: 'rank_results',
            parameters: {
              type: 'object',
              properties: {
                rankings: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      score: { type: 'number' }
                    }
                  }
                }
              }
            }
          }],
          tool_choice: { type: 'function', function: { name: 'rank_results' } }
        }),
      });
      
      const aiResult = await aiResponse.json();
      
      // Validate AI response structure
      if (!aiResult?.choices?.[0]?.message?.tool_calls?.[0]) {
        console.log('No rankings from AI, using default relevance');
        return new Response(
          JSON.stringify({ results: textResults }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const toolCall = aiResult.choices[0].message.tool_calls[0];
      const rankings = JSON.parse(toolCall.function.arguments).rankings || [];
      
      // Merge rankings with results
      const rankedResults = textResults.map(file => {
        const ranking = rankings.find((r: any) => r.id === file.id);
        return {
          ...file,
          relevance_score: ranking?.score || 0.5
        };
      }).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
      
      return new Response(
        JSON.stringify({ results: rankedResults }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ results: [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Semantic search error:', error);
    return new Response(
      JSON.stringify({ error: 'An internal error occurred while processing your search request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});