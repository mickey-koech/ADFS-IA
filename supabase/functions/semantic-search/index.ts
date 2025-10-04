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
    const { query } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Generate embedding for search query using AI
    // In production, use a proper embedding model
    // For now, use text-based search as fallback
    
    // Perform traditional text search
    const { data: textResults, error: searchError } = await supabase
      .from('files')
      .select('*')
      .or(`original_name.ilike.%${query}%,ocr_text.ilike.%${query}%,tags.cs.{${query}}`)
      .eq('is_deleted', false)
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
            content: `Rank these ${textResults.length} search results for query "${query}" and assign relevance scores (0-1). Files: ${JSON.stringify(textResults.map(f => ({ id: f.id, name: f.original_name, tags: f.tags })))}`
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
      const toolCall = aiResult.choices[0].message.tool_calls?.[0];
      const rankings = toolCall ? JSON.parse(toolCall.function.arguments).rankings : [];
      
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});