import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { Building2 } from 'lucide-react';

interface DepartmentActivityChartProps {
  data: Array<{ department: string; uploads: number; downloads: number }>;
}

export function DepartmentActivityChart({ data }: DepartmentActivityChartProps) {
  return (
    <Card className="border-success/20 bg-card/50 backdrop-blur-sm shadow-glow hover:shadow-glow transition-all">
      <CardHeader className="border-b border-success/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Building2 className="w-5 h-5 text-success animate-glow-pulse" />
          <span className="bg-gradient-to-r from-success to-secondary bg-clip-text text-transparent">
            Department Activity
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="department" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--success) / 0.2)',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}
            />
            <Legend />
            <Bar 
              dataKey="uploads" 
              fill="hsl(var(--success))" 
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="downloads" 
              fill="hsl(var(--secondary))" 
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
