import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Archive, X, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DuplicatePair {
  file: any;
  duplicates: any[];
}

export function DuplicateManager() {
  const [duplicatePairs, setDuplicatePairs] = useState<DuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDuplicates();
  }, []);

  const loadDuplicates = async () => {
    try {
      setLoading(true);
      
      const { data: files, error } = await supabase
        .from('files')
        .select('*')
        .eq('duplicate_status', 'suggested')
        .not('duplicate_of', 'is', null);
      
      if (error) throw error;
      
      const pairs: DuplicatePair[] = [];
      for (const file of files || []) {
        if (file.duplicate_of && file.duplicate_of.length > 0) {
          const { data: duplicates } = await supabase
            .from('files')
            .select('*')
            .in('id', file.duplicate_of);
          
          pairs.push({ file, duplicates: duplicates || [] });
        }
      }
      
      setDuplicatePairs(pairs);
    } catch (error: any) {
      toast({
        title: 'Failed to load duplicates',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (fileId: string, duplicateId: string) => {
    try {
      // Archive the duplicate
      const { error } = await supabase
        .from('files')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('id', duplicateId);
      
      if (error) throw error;
      
      // Update the original file
      await supabase
        .from('files')
        .update({ duplicate_status: 'confirmed' })
        .eq('id', fileId);
      
      toast({
        title: 'Files merged',
        description: 'Duplicate has been archived successfully',
      });
      
      loadDuplicates();
    } catch (error: any) {
      toast({
        title: 'Merge failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleIgnore = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ duplicate_status: 'rejected', duplicate_of: [] })
        .eq('id', fileId);
      
      if (error) throw error;
      
      toast({
        title: 'Suggestion ignored',
        description: 'AI will learn from this feedback',
      });
      
      loadDuplicates();
    } catch (error: any) {
      toast({
        title: 'Action failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    );
  }

  if (duplicatePairs.length === 0) return null;

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Copy className="h-5 w-5 text-warning" />
          <span className="font-serif">AI Detected Duplicates</span>
          <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/50">
            {duplicatePairs.length} to review
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {duplicatePairs.map(({ file, duplicates }) => (
            <div key={file.id} className="border-2 border-warning/20 rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Original File</p>
                  <div className="flex items-center gap-2 p-3 bg-card rounded border">
                    <FileText className="h-5 w-5 text-accent" />
                    <div>
                      <p className="font-medium text-sm">{file.original_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Possible Duplicate</p>
                  {duplicates.map((dup) => (
                    <div key={dup.id} className="flex items-center gap-2 p-3 bg-card rounded border">
                      <FileText className="h-5 w-5 text-warning" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{dup.original_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(dup.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className="bg-warning/20 text-warning border-warning/50">
                        {Math.round((file.similarity_score || 0) * 100)}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t">
                {duplicates.map((dup) => (
                  <div key={dup.id} className="flex gap-2 flex-1">
                    <Button
                      size="sm"
                      className="flex-1 bg-accent hover:bg-accent/90 text-primary"
                      onClick={() => handleMerge(file.id, dup.id)}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Merge & Archive
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIgnore(file.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Ignore
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}