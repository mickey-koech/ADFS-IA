import { SessionManagement } from '@/components/SessionManagement';
import { TwoFactorAuth } from '@/components/TwoFactorAuth';
import { PasswordChange } from '@/components/PasswordChange';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SecuritySettings() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Security Settings</h1>
        </div>

        <div className="grid gap-6">
          <PasswordChange />
          <TwoFactorAuth />
          <SessionManagement />
        </div>
      </div>
    </div>
  );
}