import { useMemo } from 'react';
import { Progress } from '@/components/ui/progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };

    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.number) score += 20;
    if (checks.special) score += 20;

    let label = '';
    let color = '';

    if (score <= 40) {
      label = 'Weak';
      color = 'hsl(var(--destructive))';
    } else if (score <= 60) {
      label = 'Fair';
      color = 'hsl(var(--warning))';
    } else if (score <= 80) {
      label = 'Good';
      color = 'hsl(var(--accent))';
    } else {
      label = 'Strong';
      color = 'hsl(var(--success))';
    }

    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Password strength:</span>
        <span className="font-medium" style={{ color: strength.color }}>
          {strength.label}
        </span>
      </div>
      <Progress value={strength.score} className="h-2" />
      <ul className="space-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1">
          {strength.checks?.length ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          At least 8 characters
        </li>
        <li className="flex items-center gap-1">
          {strength.checks?.uppercase ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          Uppercase letter
        </li>
        <li className="flex items-center gap-1">
          {strength.checks?.lowercase ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          Lowercase letter
        </li>
        <li className="flex items-center gap-1">
          {strength.checks?.number ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          Number
        </li>
        <li className="flex items-center gap-1">
          {strength.checks?.special ? (
            <Check className="h-3 w-3 text-success" />
          ) : (
            <X className="h-3 w-3 text-destructive" />
          )}
          Special character
        </li>
      </ul>
    </div>
  );
}