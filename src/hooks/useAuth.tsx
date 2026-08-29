'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { verifyCredentials } from '@/lib/auth-credentials';

const STORAGE_KEY = 'ecobot.auth.user';

interface AuthContextType {
  /** Username of the signed-in operator, or null. */
  user: string | null;
  /** Friendly name for the header; falls back to the username. */
  label: string | null;
  /** False until the stored session has been read on the client. */
  isReady: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  // The stored session can only be read in the browser, so the first render
  // must match the server's (logged out) output or React will complain about
  // a hydration mismatch. isReady gates rendering until after that.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Re-check against the current list so removing someone from
        // CREDENTIALS also revokes a session they already had open.
        const match = verifyCredentials(parsed.username, parsed.password);
        if (match) {
          setUser(match.username);
          setLabel(match.label ?? match.username);
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Private mode or corrupted value — treat as logged out.
    }
    setIsReady(true);
  }, []);

  const login = useCallback((username: string, password: string) => {
    const match = verifyCredentials(username, password);
    if (!match) return false;

    setUser(match.username);
    setLabel(match.label ?? match.username);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ username: match.username, password: match.password })
      );
    } catch {
      // Session just won't persist across reloads.
    }
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setLabel(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // nothing to clean up
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, label, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
