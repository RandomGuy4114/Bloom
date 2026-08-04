import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
};

const AuthContext = createContext<AuthContextValue>({
  loading: true,
  session: null,
});

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const restoreTimeout = setTimeout(() => {
      if (!mounted) {
        return;
      }

      console.warn('Session restoration timed out. Continuing without a session.');
      setSession(null);
      setLoading(false);
    }, 5000);

    async function restoreSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Unable to restore session:', error.message);
        }

        if (mounted) {
          setSession(data.session);
          console.log('Restored session:', data.session);
        }
      } catch (error) {
        console.error('Unable to restore session:', error);
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          clearTimeout(restoreTimeout);
          setLoading(false);
        }
      }
    }

    void restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) {
        return;
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(restoreTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ loading, session }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
