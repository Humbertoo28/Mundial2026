import GoogleProvider from "next-auth/providers/google"
import { createClient } from "@supabase/supabase-js"
import type { NextAuthOptions } from "next-auth"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { 
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async signIn({ user }) {
      if (user.email) {
        // 1. Check if profile already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .eq('id', user.id)
          .single();

        // 2. Upsert with conditional avatar
        const { error } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: user.name,
            // Only set default avatar if they don't have one or it's not a flagcdn link
            avatar_url: existingProfile?.avatar_url && existingProfile.avatar_url.includes('flagcdn.com') 
              ? existingProfile.avatar_url 
              : "https://flagcdn.com/w80/pa.png"
          }, { onConflict: 'id' });

        if (error) {
          console.error("Error saving profile to Supabase:", error);
        }
        return true;
      }
      return false;
    },
    async jwt({ token, user }) {
      // Persist the Google user ID into the token at sign-in
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Make userId available on the session object
      if (session.user) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
  },
}
