import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SemanticSearchProps {
  onResults: (results: any[]) => void;
  onLoading: (loading: boolean) => void;
}

export function SemanticSearch({ onResults, onLoading }: SemanticSearchProps) {
  const [query, setQuery] = useState('');
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    try {
      onLoading(true);
      
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query }
      });
      
      if (error) throw error;
      
      onResults(data.results || []);
      
      toast({
        title: 'Search complete',
        description: `Found ${data.results?.length || 0} results`,
      });
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      onLoading(false);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search with AI (e.g., 'Find all disciplinary cases from Term 2')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-24 h-12 text-base border-2 focus:border-accent"
        />
        <Button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent/90 text-primary"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-1" />
          Search
        </Button>
      </div>
    </form>
  );
}