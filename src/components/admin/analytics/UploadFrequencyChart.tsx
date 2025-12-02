import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface UploadFrequencyChartProps {
  data: Array<{ date: string; uploads: number }>;
}

export function UploadFrequencyChart({ data }: UploadFrequencyChartProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm shadow-glow hover:shadow-glow transition-all">
      <CardHeader className="border-b border-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="w-5 h-5 text-secondary animate-glow-pulse" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Upload Frequency
            </span>
          </CardTitle>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as const).map((range) => (
              <Button
                key={range}
                size="sm"
                variant={timeRange === range ? 'default' : 'ghost'}
                onClick={() => setTimeRange(range)}
                className={timeRange === range ? 'bg-gradient-to-r from-primary to-secondary' : ''}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="uploadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--primary) / 0.2)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area 
              type="monotone" 
              dataKey="uploads" 
              stroke="hsl(var(--secondary))"
              strokeWidth={3}
              fill="url(#uploadGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
