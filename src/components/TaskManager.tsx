import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, CheckCircle, AlertCircle, FileText, Scan, Repeat } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Task {
  id: string;
  type: string;
  status: string;
  progress: number;
  meta: any;
  created_at: string;
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    loadTasks();
    
    // Subscribe to real-time updates (if you enable realtime on file_predictions table)
    const channel = supabase
      .channel('task-updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'file_predictions' }, 
        () => loadTasks()
      )
      .subscribe();

    const interval = setInterval(loadTasks, 5000); // Poll every 5 seconds

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('file_predictions')
        .select('*')
        .is('interacted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Transform predictions into tasks
      const taskList: Task[] = (data || []).map(pred => ({
        id: pred.id,
        type: pred.prediction_type,
        status: 'pending',
        progress: pred.confidence * 100,
        meta: { fileId: pred.file_id, reason: pred.reason },
        created_at: pred.created_at
      }));
      
      setTasks(taskList);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'archive':
        return <FileText className="h-4 w-4" />;
      case 'duplicate':
        return <Repeat className="h-4 w-4" />;
      case 'retag':
        return <Scan className="h-4 w-4" />;
      default:
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 w-96 z-50">
      <Card className="shadow-lg border-accent/20">
        <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsCollapsed(!isCollapsed)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <CardTitle className="text-sm font-semibold">
                Active Tasks ({tasks.length})
              </CardTitle>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setTasks([]);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        {!isCollapsed && (
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card/50 hover:bg-accent/5 transition-colors"
              >
                <div className="mt-0.5 text-accent">
                  {getTaskIcon(task.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium capitalize">
                      {task.type.replace('_', ' ')}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                  
                  {task.meta?.reason && (
                    <p className="text-xs text-muted-foreground mb-2">
                      {task.meta.reason}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Progress value={task.progress} className="h-1 flex-1" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(task.progress)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
