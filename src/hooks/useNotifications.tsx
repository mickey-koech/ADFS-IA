import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Notification {
  id: string;
  type: 'message' | 'alert' | 'system';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  departmentId?: string;
  senderId?: string;
  senderName?: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userDepartmentId, setUserDepartmentId] = useState<string | null>(null);

  const fetchUserDepartment = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('department_id')
      .eq('id', user.id)
      .single();
    setUserDepartmentId(data?.department_id || null);
  }, [user]);

  const fetchUnreadMessages = useCallback(async () => {
    if (!user || !userDepartmentId) return;

    // Fetch recent messages from department that aren't from current user
    const { data: messages } = await supabase
      .from('department_messages')
      .select('id, content, created_at, sender_id')
      .eq('department_id', userDepartmentId)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (messages) {
      // Get sender names
      const senderIds = [...new Set(messages.map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', senderIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const messageNotifications: Notification[] = messages.map(msg => ({
        id: msg.id,
        type: 'message' as const,
        title: profileMap.get(msg.sender_id) || 'Department Member',
        description: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
        timestamp: msg.created_at,
        read: false,
        departmentId: userDepartmentId,
        senderId: msg.sender_id,
        senderName: profileMap.get(msg.sender_id) || 'Unknown',
      }));

      setNotifications(prev => {
        const existingIds = new Set(prev.filter(n => n.type !== 'message').map(n => n.id));
        const newMessages = messageNotifications.filter(m => !existingIds.has(m.id));
        return [...prev.filter(n => n.type !== 'message'), ...newMessages];
      });
    }
  }, [user, userDepartmentId]);

  const fetchSystemAlerts = useCallback(async () => {
    if (!user) return;

    const { data: alerts } = await supabase
      .from('anomaly_alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(5);

    if (alerts) {
      const alertNotifications: Notification[] = alerts.map(alert => ({
        id: alert.id,
        type: 'alert' as const,
        title: alert.alert_type,
        description: alert.description,
        timestamp: alert.created_at,
        read: false,
      }));

      setNotifications(prev => {
        const existing = prev.filter(n => n.type !== 'alert');
        return [...existing, ...alertNotifications];
      });
    }
  }, [user]);

  useEffect(() => {
    fetchUserDepartment();
  }, [fetchUserDepartment]);

  useEffect(() => {
    if (userDepartmentId) {
      fetchUnreadMessages();
    }
    fetchSystemAlerts();
  }, [userDepartmentId, fetchUnreadMessages, fetchSystemAlerts]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!userDepartmentId || !user) return;

    const channel = supabase
      .channel('notifications-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'department_messages',
          filter: `department_id=eq.${userDepartmentId}`,
        },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', msg.sender_id)
            .single();

          const newNotification: Notification = {
            id: msg.id,
            type: 'message',
            title: profile?.full_name || 'Department Member',
            description: msg.content.slice(0, 50) + (msg.content.length > 50 ? '...' : ''),
            timestamp: msg.created_at,
            read: false,
            departmentId: userDepartmentId,
            senderId: msg.sender_id,
            senderName: profile?.full_name || 'Unknown',
          };

          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userDepartmentId, user]);

  // Subscribe to real-time alerts
  useEffect(() => {
    const channel = supabase
      .channel('notifications-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'anomaly_alerts',
        },
        (payload) => {
          const alert = payload.new as any;
          const newNotification: Notification = {
            id: alert.id,
            type: 'alert',
            title: alert.alert_type,
            description: alert.description,
            timestamp: alert.created_at,
            read: false,
          };

          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculate unread count
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
