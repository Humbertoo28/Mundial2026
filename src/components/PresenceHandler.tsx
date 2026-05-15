'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { updatePresence } from '@/app/actions/chat';

export default function PresenceHandler({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    const trackPresence = async () => {
      // Marcar como en línea en la base de datos (persistencia para el "última vez")
      await updatePresence(true);

      // Suscribirse a los cambios de presencia
      channel
        .on('presence', { event: 'sync' }, () => {
          // console.log('Presence sync', channel.presenceState());
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          // console.log('join', key, newPresences);
        })
        .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
          if (key === userId) {
            // console.log('Mí mismo saliendo');
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              online_at: new Date().toISOString(),
              user_id: userId
            });
          }
        });
    };

    trackPresence();

    // Actualizar última conexión periódicamente (cada 2 minutos)
    const interval = setInterval(() => {
      updatePresence(true);
    }, 120000);

    const handleTabClose = () => {
       updatePresence(false);
    };

    window.addEventListener('beforeunload', handleTabClose);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleTabClose);
      updatePresence(false);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
