'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Circle, Loader2, Search } from 'lucide-react';
import { getInbox } from '@/app/actions/chat';
import Image from 'next/image';

type Conversation = {
  otherUserId: string;
  otherUser: { username: string; avatar_url: string | null; is_online: boolean; last_seen: string };
  lastMessage: { content: string; created_at: string; sender_id: string; is_read: boolean };
};

type ChatListProps = {
  onSelectChat: (userId: string, user: any) => void;
};

export default function ChatList({ onSelectChat }: ChatListProps) {
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    async function loadInbox() {
      try {
        const data = await getInbox();
        setInbox(data as Conversation[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInbox();

    // Suscribirse a cambios en los perfiles para ver quién entra/sale en vivo
    const profileChannel = supabase
      .channel('public-profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles' },
        (payload) => {
          const updatedProfile = payload.new;
          setInbox((prev) => 
            prev.map((chat) => 
              chat.otherUserId === updatedProfile.id 
                ? { ...chat, otherUser: { ...chat.otherUser, is_online: updatedProfile.is_online, last_seen: updatedProfile.last_seen } }
                : chat
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, []);

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Desconectado';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `${Math.floor(diff / 60)} min`;
    if (diff < 86400) {
      if (Math.floor(diff / 3600) === 1) return '1 hora';
      return `${Math.floor(diff / 3600)} horas`;
    }
    return new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short' }).format(date);
  };

  const filteredInbox = inbox.filter(chat => 
    chat.otherUser.username.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0D0D0D]">
      <div className="p-4 border-b border-slate-200 dark:border-white/10">
        <h2 className="text-xl font-black italic text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-indigo-600" /> MENSAJES
        </h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar conversación..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/5 border-none rounded-2xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
        ) : filteredInbox.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
            <MessageSquare className="h-12 w-12 mb-3" />
            <p className="text-sm font-bold">Sin mensajes aún</p>
            <p className="text-xs">Ve al Ranking para hablar con otros jugadores.</p>
          </div>
        ) : (
          filteredInbox.map((chat) => (
            <button
              key={chat.otherUserId}
              onClick={() => onSelectChat(chat.otherUserId, chat.otherUser)}
              className="w-full p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-3 group text-left"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden relative border-2 border-transparent group-hover:border-indigo-600/30 transition-all">
                  <Image 
                    src={chat.otherUser.avatar_url || '/default-avatar.png'} 
                    alt={chat.otherUser.username} 
                    fill 
                    className="object-cover"
                  />
                </div>
                {chat.otherUser.is_online && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#0D0D0D] rounded-full" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-slate-900 dark:text-white">{chat.otherUser.username}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      chat.otherUser.is_online 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-white/30'
                    }`}>
                      {chat.otherUser.is_online ? 'En línea' : formatLastSeen(chat.otherUser.last_seen)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Intl.DateTimeFormat('es-PA', { hour: '2-digit', minute: '2-digit' }).format(new Date(chat.lastMessage.created_at))}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40 truncate">
                  {chat.lastMessage.sender_id === chat.otherUserId ? '' : 'Tú: '}
                  {chat.lastMessage.content}
                </p>
              </div>
              {!chat.lastMessage.is_read && chat.lastMessage.sender_id === chat.otherUserId && (
                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full shrink-0 shadow-sm shadow-indigo-200" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
