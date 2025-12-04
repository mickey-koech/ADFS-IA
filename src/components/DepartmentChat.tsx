import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Paperclip, 
  X, 
  MessageCircle, 
  FileText,
  Image as ImageIcon,
  FileArchive,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  file_id: string | null;
  sender?: {
    full_name: string | null;
    email: string;
  };
  file?: {
    original_name: string;
    mime_type: string;
  } | null;
}

interface DepartmentChatProps {
  open: boolean;
  onClose: () => void;
}

export function DepartmentChat({ open, onClose }: DepartmentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && user) {
      fetchUserDepartment();
    }
  }, [open, user]);

  useEffect(() => {
    if (departmentId) {
      fetchMessages();
      subscribeToMessages();
    }
  }, [departmentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const fetchUserDepartment = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('department_id, departments(id, name)')
      .eq('id', user.id)
      .single();

    if (profile?.department_id) {
      setDepartmentId(profile.department_id);
      setDepartmentName((profile.departments as any)?.name || 'Department');
    } else {
      setDepartmentId(null);
      setDepartmentName('');
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!departmentId) return;

    const { data: messagesData, error } = await supabase
      .from('department_messages')
      .select('*')
      .eq('department_id', departmentId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Fetch sender profiles and files separately
    const senderIds = [...new Set(messagesData?.map(m => m.sender_id) || [])];
    const fileIds = [...new Set(messagesData?.filter(m => m.file_id).map(m => m.file_id) || [])];

    const [{ data: profiles }, { data: files }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email').in('id', senderIds),
      fileIds.length > 0 
        ? supabase.from('files').select('id, original_name, mime_type').in('id', fileIds)
        : { data: [] }
    ]);

    const profileMap = new Map<string, { id: string; full_name: string | null; email: string }>();
    (profiles || []).forEach(p => profileMap.set(p.id, p));
    
    const fileMap = new Map<string, { id: string; original_name: string; mime_type: string }>();
    (files || []).forEach(f => fileMap.set(f.id, f));

    const enrichedMessages: Message[] = (messagesData || []).map(m => ({
      ...m,
      sender: profileMap.get(m.sender_id) || undefined,
      file: m.file_id ? fileMap.get(m.file_id) || null : null,
    }));

    setMessages(enrichedMessages);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('department-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'department_messages',
          filter: `department_id=eq.${departmentId}`,
        },
        async (payload) => {
          const newMsg = payload.new as any;
          
          // Fetch sender info
          const { data: senderData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', newMsg.sender_id)
            .single();

          // Fetch file info if exists
          let fileData = null;
          if (newMsg.file_id) {
            const { data } = await supabase
              .from('files')
              .select('id, original_name, mime_type')
              .eq('id', newMsg.file_id)
              .single();
            fileData = data;
          }

          const enrichedMessage: Message = {
            ...newMsg,
            sender: senderData || undefined,
            file: fileData,
          };

          setMessages((prev) => [...prev, enrichedMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchUserFiles = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('files')
      .select('id, original_name, mime_type')
      .eq('uploaded_by', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20);

    setUserFiles(data || []);
    setFilePickerOpen(true);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;
    if (!departmentId || !user) return;

    setSending(true);

    const { error } = await supabase.from('department_messages').insert({
      department_id: departmentId,
      sender_id: user.id,
      content: newMessage.trim() || (selectedFile ? `Shared: ${selectedFile.original_name}` : ''),
      file_id: selectedFile?.id || null,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } else {
      setNewMessage('');
      setSelectedFile(null);
    }

    setSending(false);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (mimeType.includes('pdf') || mimeType.includes('document')) return <FileText className="w-4 h-4" />;
    return <FileArchive className="w-4 h-4" />;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed right-6 z-40 transition-all duration-300",
        isMinimized ? "bottom-24 w-72" : "bottom-24 w-96 h-[500px]"
      )}
    >
      <Card className="h-full flex flex-col border-primary/20 shadow-elegant overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-primary/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-sm font-display">{departmentName || 'Department Chat'}</CardTitle>
                {messages.length > 0 && (
                  <p className="text-xs text-muted-foreground">{messages.length} messages</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : !departmentId ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    You're not assigned to a department yet. Contact an admin to join a department.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[320px] p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        No messages yet. Start the conversation!
                      </div>
                    ) : (
                      messages.map((message) => {
                        const isOwn = message.sender_id === user?.id;
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex gap-2",
                              isOwn ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            {!isOwn && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {getInitials(message.sender?.full_name || null, message.sender?.email || '')}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={cn(
                                "max-w-[75%] space-y-1",
                                isOwn ? "items-end" : "items-start"
                              )}
                            >
                              {!isOwn && (
                                <p className="text-xs text-muted-foreground">
                                  {message.sender?.full_name || message.sender?.email}
                                </p>
                              )}
                              <div
                                className={cn(
                                  "px-3 py-2 rounded-2xl text-sm",
                                  isOwn
                                    ? "bg-primary text-accent rounded-br-md"
                                    : "bg-secondary rounded-bl-md"
                                )}
                              >
                                {message.content}
                                {message.file && (
                                  <div className={cn(
                                    "flex items-center gap-2 mt-2 p-2 rounded-lg",
                                    isOwn ? "bg-accent/10" : "bg-background/50"
                                  )}>
                                    {getFileIcon(message.file.mime_type)}
                                    <span className="text-xs truncate max-w-[150px]">
                                      {message.file.original_name}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <p className={cn(
                                "text-[10px] text-muted-foreground",
                                isOwn ? "text-right" : "text-left"
                              )}>
                                {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>

            {departmentId && (
              <div className="p-3 border-t border-primary/10 flex-shrink-0">
                {selectedFile && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-secondary rounded-lg">
                    {getFileIcon(selectedFile.mime_type)}
                    <span className="text-xs flex-1 truncate">{selectedFile.original_name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setSelectedFile(null)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={fetchUserFiles}
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 h-9 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 flex-shrink-0"
                    onClick={sendMessage}
                    disabled={sending || (!newMessage.trim() && !selectedFile)}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* File Picker Dialog */}
      <Dialog open={filePickerOpen} onOpenChange={setFilePickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share a File</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {userFiles.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files to share. Upload some files first.
                </p>
              ) : (
                userFiles.map((file) => (
                  <button
                    key={file.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-colors text-left"
                    onClick={() => {
                      setSelectedFile(file);
                      setFilePickerOpen(false);
                    }}
                  >
                    {getFileIcon(file.mime_type)}
                    <span className="text-sm flex-1 truncate">{file.original_name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}