import { useEffect, useState } from 'react';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AnomalyAlert {
  id: string;
  alert_type: string;
  severity: string;
  description: string;
  created_at: string;
}

export function AnomalyAlerts() {
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    checkAnomalies();
    
    // Check every minute
    const interval = setInterval(checkAnomalies, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const checkAnomalies = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('detect-anomalies');
      
      if (error) throw error;
      
      if (data?.alerts && data.alerts.length > 0) {
        setAlerts(data.alerts);
      }
    } catch (error: any) {
      console.error('Failed to check anomalies:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('anomaly_alerts')
        .update({
          resolved: true,
          resolved_by: user?.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', alertId);
      
      if (error) throw error;
      
      setAlerts(alerts.filter(a => a.id !== alertId));
      
      toast({
        title: 'Alert resolved',
        description: 'This anomaly has been marked as resolved',
      });
    } catch (error: any) {
      toast({
        title: 'Failed to resolve alert',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (alerts.length === 0) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive/10 border-destructive text-destructive';
      case 'high': return 'bg-warning/10 border-warning text-warning';
      case 'medium': return 'bg-accent/10 border-accent text-accent';
      default: return 'bg-muted border-muted-foreground text-muted-foreground';
    }
  };

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              {alert.severity === 'critical' ? (
                <AlertTriangle className="h-5 w-5 mt-0.5" />
              ) : (
                <Shield className="h-5 w-5 mt-0.5" />
              )}
              <div>
                <AlertTitle className="font-serif">Security Alert</AlertTitle>
                <AlertDescription className="mt-1">
                  {alert.description}
                </AlertDescription>
                <p className="text-xs mt-2 opacity-75">
                  {new Date(alert.created_at).toLocaleString()}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => resolveAlert(alert.id)}
              className="ml-4"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Resolve
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  );
}