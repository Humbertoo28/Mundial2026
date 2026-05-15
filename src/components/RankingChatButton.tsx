'use client';

import { MessageSquare } from 'lucide-react';

export default function RankingChatButton({ userId, user }: { userId: string, user: any }) {
  const handleClick = () => {
    // Disparar evento personalizado que ChatWidget escuchará
    const event = new CustomEvent('open-chat', { 
      detail: { id: userId, user } 
    });
    window.dispatchEvent(event);
  };

  return (
    <button 
      onClick={handleClick}
      className="flex items-center justify-center bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 hover:text-white px-4 py-2 rounded-xl transition-all group"
      title="Enviar mensaje"
    >
      <MessageSquare className="h-4 w-4 group-hover:scale-110" />
    </button>
  );
}
