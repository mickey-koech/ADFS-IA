import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { FileList } from '@/components/FileList';
import { DashboardHeader } from '@/components/DashboardHeader';
import { DashboardSidebar } from '@/components/DashboardSidebar';
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
    <div className="flex h-screen bg-background">
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
          <div className="max-w-7xl mx-auto space-y-6">
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
    </div>
  );
}
