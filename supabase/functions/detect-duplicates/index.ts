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
    const { fileId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get file with embedding
    const { data: file, error: fileError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    if (fileError) throw fileError;
    if (!file.embedding) {
      return new Response(
        JSON.stringify({ error: 'File not yet processed for embeddings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Find similar files using pgvector
    const { data: similarFiles, error: searchError } = await supabase
      .rpc('match_files', {
        query_embedding: file.embedding,
        match_threshold: 0.75,
        match_count: 10
      });
    
    if (searchError) throw searchError;
    
    // Filter out the file itself and calculate similarity scores
    const duplicates = (similarFiles || [])
      .filter((f: any) => f.id !== fileId)
      .map((f: any) => ({
        id: f.id,
        filename: f.original_name,
        similarity: f.similarity,
        status: f.similarity >= 0.88 ? 'high' : 'possible'
      }));
    
    if (duplicates.length > 0) {
      // Update file with duplicate information
      const highConfidenceDuplicates = duplicates.filter((d: any) => d.similarity >= 0.88);
      
      const { error: updateError } = await supabase
        .from('files')
        .update({
          duplicate_of: duplicates.map((d: any) => d.id),
          similarity_score: duplicates[0]?.similarity || null,
          duplicate_status: highConfidenceDuplicates.length > 0 ? 'suggested' : null
        })
        .eq('id', fileId);
      
      if (updateError) throw updateError;
      
      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: file.uploaded_by,
        action: 'duplicates_detected',
        resource_type: 'file',
        resource_id: fileId,
        metadata: { duplicateCount: duplicates.length, highConfidence: highConfidenceDuplicates.length }
      });
    }
    
    return new Response(
      JSON.stringify({ duplicates }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Duplicate detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});