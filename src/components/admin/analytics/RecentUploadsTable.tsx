import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface Upload {
  id: string;
  fileName: string;
  user: string;
  department: string;
  size: string;
  status: 'reviewed' | 'pending' | 'flagged';
  timestamp: string;
}

interface RecentUploadsTableProps {
  uploads: Upload[];
}

const statusConfig = {
  reviewed: { variant: 'default' as const, className: 'bg-success/20 text-success' },
  pending: { variant: 'secondary' as const, className: 'bg-warning/20 text-warning' },
  flagged: { variant: 'destructive' as const, className: 'bg-destructive/20 text-destructive' },
};

export function RecentUploadsTable({ uploads }: RecentUploadsTableProps) {
  const [sortField, setSortField] = useState<keyof Upload>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Upload) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedUploads = [...uploads].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const modifier = sortDirection === 'asc' ? 1 : -1;
    return aValue > bValue ? modifier : -modifier;
  });

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="border-b border-primary/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Recent Uploads Activity
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('fileName')} className="h-8">
                    File Name <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('user')} className="h-8">
                    User <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('department')} className="h-8">
                    Department <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('timestamp')} className="h-8">
                    Time <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUploads.map((upload) => (
                <TableRow key={upload.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{upload.fileName}</TableCell>
                  <TableCell className="text-muted-foreground">{upload.user}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-secondary/30">
                      {upload.department}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{upload.size}</TableCell>
                  <TableCell>
                    <Badge className={statusConfig[upload.status].className}>
                      {upload.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(upload.timestamp), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
