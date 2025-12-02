import { Card, CardContent } from '@/components/ui/card';
import { Upload, Download, AlertCircle, Clock, TrendingUp, Users } from 'lucide-react';

interface StatCard {
  title: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  color: string;
}

interface StatisticalSummaryProps {
  stats: StatCard[];
}

export function StatisticalSummary({ stats }: StatisticalSummaryProps) {
  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    if (trend === 'down') return <TrendingUp className="w-3 h-3 rotate-180" />;
    return null;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        return (
          <Card 
            key={idx}
            className={`border-${stat.color}/20 bg-gradient-to-br from-card/80 to-${stat.color}/5 backdrop-blur-sm hover:shadow-glow hover:border-${stat.color}/40 transition-all group`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                {stat.trend !== 'neutral' && (
                  <div className={`flex items-center gap-1 text-xs ${
                    stat.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    {getTrendIcon(stat.trend)}
                    <span>{stat.change}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className={`text-2xl font-bold text-${stat.color} group-hover:scale-105 transition-transform inline-block`}>
                  {stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
