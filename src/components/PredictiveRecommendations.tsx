import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileText, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Prediction {
  fileId: string;
  predictionType: string;
  confidence: number;
  reason: string;
  file?: any;
}

export function PredictiveRecommendations() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadPredictions();
  }, [user]);

  const loadPredictions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('generate-predictions', {
        body: { userId: user.id }
      });
      
      if (error) {
        console.error('Prediction error:', error);
        throw error;
      }
      
      if (!data) {
        setPredictions([]);
        return;
      }
      
      // Load file details for predictions
      if (data.predictions && data.predictions.length > 0) {
        const fileIds = data.predictions.map((p: Prediction) => p.fileId);
        const { data: files } = await supabase
          .from('files')
          .select('*')
          .in('id', fileIds);
        
        const enrichedPredictions = data.predictions.map((p: Prediction) => ({
          ...p,
          file: files?.find(f => f.id === p.fileId)
        }));
        
        setPredictions(enrichedPredictions);
      }
    } catch (error: any) {
      toast({
        title: 'Failed to load recommendations',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-accent/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (predictions.length === 0) return null;

  return (
    <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <TrendingUp className="h-5 w-5 text-accent" />
          <span className="font-serif">Likely Needed Today</span>
          <Sparkles className="h-4 w-4 text-accent animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {predictions.map((prediction) => (
            <div
              key={prediction.fileId}
              className="flex items-center justify-between p-4 bg-card rounded-lg border-2 border-accent/30 hover:border-accent transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-accent" />
                <div>
                  <p className="font-medium text-primary">{prediction.file?.original_name}</p>
                  <p className="text-sm text-muted-foreground">{prediction.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-accent/10 text-accent border-accent/30"
                >
                  {Math.round(prediction.confidence * 100)}% match
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-accent text-accent hover:bg-accent hover:text-primary"
                  onClick={() => window.open(`/files/${prediction.fileId}`, '_blank')}
                >
                  Open
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}