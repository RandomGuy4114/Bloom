import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  availableThemes,
  STANDARD_THEMES,
  SUPPORTER_THEMES,
  themePalettes,
  type ThemeName,
  type ThemePalette,
} from '@/theme/colors';

export { availableThemes, STANDARD_THEMES, SUPPORTER_THEMES };
export type { ThemeName };

type ThemeContextValue = {
  colors: ThemePalette;
  loading: boolean;
  setTheme: (theme: ThemeName) => Promise<void>;
  supporter: boolean;
  theme: ThemeName;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: themePalettes.light,
  loading: true,
  setTheme: async () => {},
  supporter: false,
  theme: 'light',
});

export function ThemeProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>('light');
  const [supporter, setSupporter] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session?.user.id) {
      setLoading(false);
      return;
    }

    supabase
      .from('profiles')
      .select('Theme, supporter')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return;
        if (!error && data) {
          setSupporter(data.supporter === true);
          setThemeState((data.Theme as ThemeName) || 'light');
        }
        setLoading(false);
      });

    return () => { active = false; };
  }, [session?.user.id]);

  const setTheme = useCallback(async (nextTheme: ThemeName) => {
    if (!session?.user.id) return;
    const allowed = availableThemes(supporter);
    if (!allowed.includes(nextTheme)) throw new Error('That theme is only available to Bloom supporters.');

    const { error } = await supabase.from('profiles').update({ Theme: nextTheme }).eq('id', session.user.id);
    if (error) throw error;
    setThemeState(nextTheme);
  }, [session?.user.id, supporter]);

  const colors = useMemo(() => themePalettes[theme], [theme]);

  return (
    <ThemeContext.Provider value={{ colors, loading, setTheme, supporter, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
