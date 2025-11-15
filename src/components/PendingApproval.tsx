import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Clock, Mail } from 'lucide-react';

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <Card className="w-full max-w-md shadow-elegant border-warning/20">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-warning/20 to-warning/10 flex items-center justify-center animate-glow-pulse">
            <Clock className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-3xl font-display text-primary">Pending Approval</CardTitle>
          <CardDescription className="text-base">
            Your account is currently under review by our administrators
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">What's Next?</p>
                <p className="text-sm text-muted-foreground">
                  You'll receive an email notification once your account has been approved by an administrator.
                  This typically takes 1-2 business days.
                </p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>While you wait:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Check your email for updates</li>
              <li>Ensure your email address is correct</li>
              <li>Contact your administrator if urgent</li>
            </ul>
          </div>

          <Button
            onClick={signOut}
            variant="outline"
            className="w-full border-primary/20 hover:bg-primary/5"
          >
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
