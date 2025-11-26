import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardSidebar } from '@/components/DashboardSidebar';
import { SemanticSearch } from '@/components/SemanticSearch';
import { PredictiveRecommendations } from '@/components/PredictiveRecommendations';
import { DuplicateManager } from '@/components/DuplicateManager';
import { AnomalyAlerts } from '@/components/AnomalyAlerts';
import { TaskManager } from '@/components/TaskManager';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { ActivityFeed } from '@/components/ActivityFeed';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { user } = useAuth();

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="flex h-screen bg-background w-full">
      <DashboardSidebar
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
            <div className="mb-8">
              <h1 className="text-5xl font-playfair font-bold text-primary mb-2 tracking-tight">AFDS</h1>
              <p className="text-lg text-muted-foreground">AI-Powered Digital Filing System</p>
            </div>
            
            <AnomalyAlerts />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <SemanticSearch 
                  onResults={(results) => console.log(results)}
                  onLoading={(loading) => console.log(loading)}
                />
              </div>
              <ActivityFeed />
            </div>
            
            <PredictiveRecommendations />
            
            <DuplicateManager />
            
            <FileUpload onUploadComplete={handleUploadComplete} />
            
            <FileList
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              selectedFolder={selectedFolder}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </main>
      </div>
      
      <TaskManager />
      <OnboardingFlow />
    </div>
  );
}
