'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, X, Loader2, Circle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { sendMessage, getConversation } from '@/app/actions/chat';
import Image from 'next/image';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  sender?: { username: string; avatar_url: string | null };
};

type ChatWindowProps = {
  currentUser: { id: string; username: string };
  otherUser: { id: string; username: string; avatar_url: string | null; is_online?: boolean; last_seen?: string };
  onClose: () => void;
};

export default function ChatWindow({ currentUser, otherUser, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMessages() {
      try {
        const data = await getConversation(otherUser.id);
        setMessages(data as Message[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();

    // Suscribirse a mensajes nuevos en tiempo real
    const channel = supabase
      .channel(`chat-${currentUser.id}-${otherUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${currentUser.id}))`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser.id, otherUser.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const content = input.trim();
    setInput('');
    setIsSending(true);

    try {
      await sendMessage(otherUser.id, content);
    } catch (err) {
      console.error(err);
      setInput(content); // Devolver el texto si falló
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-PA', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return 'Desconectado';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000; // segundos

    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hoy ${formatTime(dateStr)}`;
    return new Intl.DateTimeFormat('es-PA', { day: '2-digit', month: 'short' }).format(date);
  };

  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 right-4 w-full max-w-[360px] h-[500px] bg-white dark:bg-[#0D0D0D] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col z-[150] overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 overflow-hidden relative">
              <Image 
                src={otherUser.avatar_url || '/default-avatar.png'} 
                alt={otherUser.username} 
                fill 
                className="object-cover"
              />
            </div>
            {otherUser.is_online && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#0D0D0D] rounded-full" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{otherUser.username}</h3>
            <p className="text-[10px] text-slate-500 dark:text-white/40 flex items-center gap-1">
              {otherUser.is_online ? (
                <span className="text-emerald-500 font-bold flex items-center gap-1">
                   <Circle className="h-1.5 w-1.5 fill-current" /> En línea
                </span>
              ) : (
                <>
                  <Clock className="h-2 w-2" /> 
                  Visto {formatLastSeen(otherUser.last_seen)}
                </>
              )}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors">
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-hide"
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3">
              <Send className="h-6 w-6 text-slate-300" />
            </div>
            <p className="text-xs text-slate-500 dark:text-white/30">
              ¡Inicia la conversación! Dile algo a {otherUser.username} para coordinar un intercambio.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${
                  msg.sender_id === currentUser.id 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white rounded-tl-none'
                }`}
              >
                <p>{msg.content}</p>
                <p className={`text-[9px] mt-1 text-right ${msg.sender_id === currentUser.id ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {formatTime(msg.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          className="flex-1 bg-slate-100 dark:bg-white/5 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-600 dark:text-white outline-none"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || isSending}
          className="p-2 bg-indigo-600 text-white rounded-full disabled:opacity-50 disabled:bg-slate-300 transition-all hover:scale-105 active:scale-95"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </form>
    </motion.div>
  );
}
