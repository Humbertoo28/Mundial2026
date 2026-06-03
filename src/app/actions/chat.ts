'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from "next/cache";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function sendMessage(receiverId: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const senderId = session.user.id;

  if (!content.trim()) return { success: false, error: "Mensaje vacío" };

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content: content.trim()
    })
    .select()
    .single();

  if (error) {
    console.error("Error al enviar mensaje:", error);
    throw new Error("No se pudo enviar el mensaje");
  }

  return { success: true, message: data };
}

export async function getConversation(otherUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const userId = session.user.id;

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(username, avatar_url),
      receiver:profiles!receiver_id(username, avatar_url)
    `)
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Error al obtener conversación:", error);
    throw new Error("Error al cargar mensajes");
  }

  return data;
}

export async function getInbox() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("No autenticado");
  const userId = session.user.id;

  // Obtenemos los últimos mensajes donde el usuario participa
  // En Supabase/Postgres, una consulta más eficiente sería un GROUP BY o DISTINCT ON
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(username, avatar_url, last_seen, is_online),
      receiver:profiles!receiver_id(username, avatar_url, last_seen, is_online)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Agrupar por el otro usuario para tener una lista de chats únicos
  const conversations: Record<string, any> = {};
  data.forEach(msg => {
    const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
    const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    
    if (!conversations[otherUserId]) {
      conversations[otherUserId] = {
        otherUser,
        otherUserId,
        lastMessage: msg
      };
    }
  });

  return Object.values(conversations);
}

export async function updatePresence(isOnline: boolean) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  const userId = session.user.id;

  await supabase
    .from('profiles')
    .update({ 
      is_online: isOnline,
      last_seen: new Date().toISOString() 
    })
    .eq('user_id', userId);
}

export async function markConversationAsRead(otherUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { success: false, error: "No autenticado" };
  const userId = session.user.id;

  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', otherUserId)
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error("Error al marcar mensajes como leídos:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
