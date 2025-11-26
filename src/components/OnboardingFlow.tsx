import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Search, Shield, ChevronRight } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: OnboardingStep[] = [
  {
    title: 'Welcome to Digital Filing',
    description: 'Organize, manage, and secure your files with our intelligent filing system.',
    icon: <FileText className="h-12 w-12 text-primary" />,
  },
  {
    title: 'Upload Your Files',
    description: 'Drag and drop files or click to upload. We support all common file formats.',
    icon: <Upload className="h-12 w-12 text-primary" />,
  },
  {
    title: 'Smart Search',
    description: 'Find files instantly with our semantic search powered by AI.',
    icon: <Search className="h-12 w-12 text-primary" />,
  },
  {
    title: 'Secure & Private',
    description: 'Your files are encrypted and protected with enterprise-grade security.',
    icon: <Shield className="h-12 w-12 text-primary" />,
  },
];

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      setOpen(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setOpen(false);
  };

  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {currentStepData.icon}
          </div>
          <DialogTitle className="text-center text-2xl">
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center gap-2 my-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={handleComplete}
          >
            Skip
          </Button>
          <Button onClick={handleNext}>
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Get Started'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
