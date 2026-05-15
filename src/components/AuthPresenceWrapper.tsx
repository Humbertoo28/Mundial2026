'use client';

import { useSession } from "next-auth/react";
import PresenceHandler from "./PresenceHandler";

export default function AuthPresenceWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  
  return (
    <>
      {session?.user?.id && <PresenceHandler userId={session.user.id} />}
      {children}
    </>
  );
}
