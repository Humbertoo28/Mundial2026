'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import { getProfile } from '@/app/actions/profile';

export default function ChatWidget() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState<{ id: string; user: any } | null>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      if (session?.user?.id) {
        const profile = await getProfile();
        setCurrentProfile(profile);
      }
    }
    loadProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    const handleOpenChat = (e: any) => {
      setIsOpen(true);
      setActiveChat(e.detail);
    };

    window.addEventListener('open-chat', handleOpenChat);
    return () => window.removeEventListener('open-chat', handleOpenChat);
  }, []);

  if (!session?.user?.id) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[140]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 w-[350px] h-[500px] bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {activeChat ? (
              <ChatWindow 
                currentUser={{ 
                  id: session.user.id, 
                  username: currentProfile?.username || session.user.name || 'Usuario',
                  avatar_url: currentProfile?.avatar_url?.startsWith('http') ? currentProfile.avatar_url : 'https://flagcdn.com/w80/pa.png'
                }}
                otherUser={{ 
                  id: activeChat.id, 
                  username: activeChat.user.username, 
                  avatar_url: activeChat.user.avatar_url?.startsWith('http') ? activeChat.user.avatar_url : 'https://flagcdn.com/w80/pa.png',
                  is_online: activeChat.user.is_online,
                  last_seen: activeChat.user.last_seen
                }}
                onClose={() => setActiveChat(null)}
              />
            ) : (
              <ChatList 
                currentUserId={session.user.id}
                onSelectChat={(id, user) => setActiveChat({ id, user })}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
          isOpen 
            ? 'bg-slate-100 dark:bg-white/10 text-slate-500 rotate-90' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        {!isOpen && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-[#0D0D0D] rounded-full flex items-center justify-center">
             <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
          </div>
        )}
      </button>
    </div>
  );
}
