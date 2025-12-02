import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { FileType } from 'lucide-react';

interface FileTypeDistributionProps {
  data: Array<{ name: string; value: number; color: string }>;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
];

export function FileTypeDistribution({ data }: FileTypeDistributionProps) {
  return (
    <Card className="border-accent/20 bg-card/50 backdrop-blur-sm shadow-glow hover:shadow-glow transition-all">
      <CardHeader className="border-b border-accent/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileType className="w-5 h-5 text-accent animate-glow-pulse" />
          <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
            File Type Distribution
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--accent) / 0.2)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
