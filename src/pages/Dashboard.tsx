import { useState } from 'react';
import { FileList } from '@/components/FileList';
import { DashboardHeader } from '@/components/DashboardHeader';
import { FloatingDock } from '@/components/FloatingDock';
import { DepartmentChat } from '@/components/DepartmentChat';
import { SemanticSearch } from '@/components/SemanticSearch';
import { PredictiveRecommendations } from '@/components/PredictiveRecommendations';
import { DuplicateManager } from '@/components/DuplicateManager';
import { AnomalyAlerts } from '@/components/AnomalyAlerts';
import { TaskManager } from '@/components/TaskManager';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { ActivityFeed } from '@/components/ActivityFeed';
import { SmartUpload } from '@/components/SmartUpload';
import { useAuth } from '@/hooks/useAuth';

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const { user } = useAuth();

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background w-full pb-24">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-6 animate-fade-in">
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
          
          <SmartUpload onUploadComplete={handleUploadComplete} />
          
          <FileList
            searchQuery={searchQuery}
            selectedTags={selectedTags}
            selectedFolder={selectedFolder}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </main>
      
      <FloatingDock
        selectedFolder={selectedFolder}
        onFolderSelect={setSelectedFolder}
        selectedTags={selectedTags}
        onTagsChange={setSelectedTags}
        onChatOpen={() => setChatOpen(!chatOpen)}
        chatOpen={chatOpen}
      />
      
      <DepartmentChat 
        open={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
      
      <TaskManager />
      <OnboardingFlow />
    </div>
  );
}