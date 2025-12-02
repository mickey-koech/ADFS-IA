import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, AlertTriangle, TrendingUp, FileWarning, Target, Zap } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Insight {
  id: string;
  type: 'anomaly' | 'prediction' | 'recommendation' | 'warning';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
}

interface AIInsightsPanelProps {
  insights: Insight[];
}

const severityConfig = {
  low: { color: 'text-success', badge: 'bg-success/20 text-success' },
  medium: { color: 'text-warning', badge: 'bg-warning/20 text-warning' },
  high: { color: 'text-destructive', badge: 'bg-destructive/20 text-destructive' },
};

const typeIcons = {
  anomaly: AlertTriangle,
  prediction: TrendingUp,
  recommendation: Target,
  warning: FileWarning,
};

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
  return (
    <Card className="border-ai-glow/30 bg-gradient-to-br from-card/80 to-ai-glow/5 backdrop-blur-sm shadow-glow hover:shadow-[0_0_40px_rgba(55,241,227,0.5)] transition-all">
      <CardHeader className="border-b border-ai-glow/20">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="w-5 h-5 text-ai-glow animate-glow-pulse" />
          <span className="bg-gradient-to-r from-ai-glow to-secondary bg-clip-text text-transparent">
            AI Intelligence Center
          </span>
          <Zap className="w-4 h-4 text-ai-glow ml-auto animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {insights.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>AI is analyzing system data...</p>
                <p className="text-sm mt-2">Insights will appear here</p>
              </div>
            ) : (
              insights.map((insight) => {
                const Icon = typeIcons[insight.type];
                const config = severityConfig[insight.severity];
                
                return (
                  <div
                    key={insight.id}
                    className="p-4 rounded-lg border border-ai-glow/20 bg-gradient-to-br from-background/50 to-ai-glow/5 hover:border-ai-glow/40 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-ai-glow/10 flex items-center justify-center flex-shrink-0 group-hover:bg-ai-glow/20 transition-colors">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground group-hover:text-ai-glow transition-colors">
                            {insight.title}
                          </h4>
                          <Badge className={config.badge} variant="secondary">
                            {insight.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {insight.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Target className="w-3 h-3" />
                            <span>Confidence: {insight.confidence}%</span>
                          </div>
                          <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-ai-glow to-secondary rounded-full transition-all"
                              style={{ width: `${insight.confidence}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
