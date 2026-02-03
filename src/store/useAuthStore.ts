import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase, supabaseConfig } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  level: number;
  isVerified?: boolean;
  followers: number;
  following: number;
  bio?: string;
  website?: string;
  location?: string;
  joinedDate: string;
}

type AuthMode = 'supabase' | 'local' | 'guest';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  session: Session | null;
  isLoading: boolean;
  authMode: AuthMode;
  
  // Actions
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (
    email: string,
    password: string,
    username?: string
  ) => Promise<{ error: string | null; needsEmailConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  getCurrentUser: () => User | null;
  checkUser: () => void;
  loginAsGuest: () => void;
}

let authUnsubscribe: (() => void) | null = null;

function mapSessionToUser(session: Session | null): User | null {
  const sbUser = session?.user;
  if (!sbUser) return null;
  const meta = (sbUser.user_metadata ?? {}) as Record<string, unknown>;
  const email = sbUser.email ?? '';
  const usernameFromMeta = typeof meta.username === 'string' ? meta.username : undefined;
  const fullNameFromMeta = typeof meta.full_name === 'string' ? meta.full_name : undefined;
  const avatarFromMeta = typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined;
  const fallbackUsername = email ? email.split('@')[0] : 'user';
  const rawLevel = meta.level;
  const levelFromMeta =
    typeof rawLevel === 'number'
      ? rawLevel
      : typeof rawLevel === 'string'
        ? Number(rawLevel)
        : NaN;
  const level = Number.isFinite(levelFromMeta) && levelFromMeta > 0 ? Math.floor(levelFromMeta) : 1;

  return {
    id: sbUser.id,
    username: usernameFromMeta ?? fallbackUsername,
    name: fullNameFromMeta ?? usernameFromMeta ?? fallbackUsername,
    email,
    avatar: avatarFromMeta ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(usernameFromMeta ?? fallbackUsername)}&background=random`,
    level,
    isVerified: false,
    followers: 0,
    following: 0,
    joinedDate: sbUser.created_at ?? new Date().toISOString()
  };
}

const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    const m = error.message.toLowerCase();
    if (
      m.includes('load failed') ||
      m.includes('failed to fetch') ||
      m.includes('network request failed') ||
      m.includes('the internet connection appears to be offline')
    ) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }
  if (typeof error === 'string') return error;
  console.error('Unknown auth error:', error);
  return 'Authentication failed. Please try again.';
};

const LOCAL_USERS_KEY = 'elix_local_users_v1';
const LOCAL_SESSION_KEY = 'elix_local_session_v1';
const FORCE_LOCAL_AUTH = import.meta.env.VITE_FORCE_LOCAL_AUTH === 'true';
const ALLOW_LOCAL_AUTH = import.meta.env.DEV || import.meta.env.VITE_ALLOW_LOCAL_AUTH === 'true' || FORCE_LOCAL_AUTH;

type LocalAuthUser = {
  id: string;
  email: string;
  password: string;
  username: string;
  createdAt: string;
};

const safeJsonParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const readLocalUsers = (): LocalAuthUser[] => {
  const parsed = safeJsonParse<LocalAuthUser[]>(
    typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_USERS_KEY) : null
  );
  return Array.isArray(parsed) ? parsed : [];
};

const writeLocalUsers = (users: LocalAuthUser[]) => {
  try {
    window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch {
    void users;
  }
};

const randomId = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as Crypto).randomUUID();
    }
  } catch {
    void 0;
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const mapLocalUserToUser = (u: LocalAuthUser): User => {
  return {
    id: u.id,
    username: u.username,
    name: u.username,
    email: u.email,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(u.username)}&background=random`,
    level: 1,
    isVerified: false,
    followers: 0,
    following: 0,
    joinedDate: u.createdAt
  };
};

const persistLocalSession = (u: LocalAuthUser) => {
  try {
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify({ userId: u.id }));
  } catch {
    void u;
  }
};

const clearLocalSession = () => {
  try {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
  } catch {
    void 0;
  }
};

const readLocalSessionUser = (): LocalAuthUser | null => {
  const sessionRaw =
    typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_SESSION_KEY) : null;
  const parsed = safeJsonParse<{ userId: string }>(sessionRaw);
  const userId = parsed?.userId;
  if (!userId) return null;
  const users = readLocalUsers();
  return users.find((u) => u.id === userId) ?? null;
};

const localAuthSignIn = (set: (partial: Partial<AuthStore>) => void, email: string, password: string) => {
  const users = readLocalUsers();
  const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!found) return { error: 'Invalid email or password.' };
  if (found.password !== password) return { error: 'Invalid email or password.' };
  persistLocalSession(found);
  set({ session: null, user: mapLocalUserToUser(found), isAuthenticated: true, isLoading: false, authMode: 'local' });
  return { error: null };
};

const localAuthSignUp = (
  set: (partial: Partial<AuthStore>) => void,
  email: string,
  password: string,
  username?: string
) => {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return { error: 'Email is required.', needsEmailConfirmation: false };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.', needsEmailConfirmation: false };
  const users = readLocalUsers();
  const exists = users.some((u) => u.email.toLowerCase() === normalizedEmail.toLowerCase());
  if (exists) return { error: 'Account already exists for this email.', needsEmailConfirmation: false };

  const derivedUsername = username?.trim() || normalizedEmail.split('@')[0] || 'user';
  const createdAt = new Date().toISOString();
  const nextUser: LocalAuthUser = { id: randomId(), email: normalizedEmail, password, username: derivedUsername, createdAt };
  const nextUsers = [...users, nextUser];
  writeLocalUsers(nextUsers);
  persistLocalSession(nextUser);
  set({ session: null, user: mapLocalUserToUser(nextUser), isAuthenticated: true, isLoading: false, authMode: 'local' });
  return { error: null, needsEmailConfirmation: false };
};

const localAuthSignUpOrSignIn = (
  set: (partial: Partial<AuthStore>) => void,
  email: string,
  password: string,
  username?: string
) => {
  const signUpRes = localAuthSignUp(set, email, password, username);
  if (!signUpRes.error) return signUpRes;
  if (signUpRes.error.toLowerCase().includes('already exists')) {
    const signInRes = localAuthSignIn(set, email, password);
    if (!signInRes.error) return { error: null, needsEmailConfirmation: false };
  }
  return signUpRes;
};

const isInfraAuthError = (message: string) => {
  const m = message.toLowerCase();
  return (
    m.includes('load failed') ||
    m.includes('failed to fetch') ||
    m.includes('network request failed') ||
    m.includes('the internet connection appears to be offline') ||
    m.includes('fetch') ||
    m.includes('network') ||
    m.includes('invalid api key') ||
    m.includes('jwt') ||
    m.includes('not found') ||
    m.includes('signup is disabled') ||
    m.includes('signups not allowed') ||
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('authentication failed')
  );
};

export const useAuthStore = create<AuthStore>()(
  (set, get) => ({
    user: null,
    isAuthenticated: false,
    session: null,
    isLoading: true,
    authMode: supabaseConfig.hasValidConfig && !FORCE_LOCAL_AUTH ? 'supabase' : ALLOW_LOCAL_AUTH ? 'local' : 'supabase',

    signInWithPassword: async (email, password) => {
      if (FORCE_LOCAL_AUTH || !supabaseConfig.hasValidConfig) {
        if (ALLOW_LOCAL_AUTH) return localAuthSignIn(set, email, password);
        return { error: 'Authentication is not configured.' };
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (ALLOW_LOCAL_AUTH) {
            const localRes = localAuthSignIn(set, email, password);
            if (!localRes.error) return localRes;
            if (isInfraAuthError(error.message)) {
              return { error: `Supabase login failed (${error.message}). ${localRes.error}` };
            }
          }
          return { error: error.message };
        }
        const session = data.session ?? null;
        if (!session) {
          const { data: sessionData } = await supabase.auth.getSession();
          const recoveredSession = sessionData.session ?? null;
          if (recoveredSession) {
            clearLocalSession();
            set({ session: recoveredSession, user: mapSessionToUser(recoveredSession), isAuthenticated: true, isLoading: false, authMode: 'supabase' });
            return { error: null };
          }
          if (ALLOW_LOCAL_AUTH) {
            const localRes = localAuthSignIn(set, email, password);
            if (!localRes.error) return localRes;
          }
          return { error: 'No active session returned from Supabase.' };
        }
        clearLocalSession();
        set({ session, user: mapSessionToUser(session), isAuthenticated: true, isLoading: false, authMode: 'supabase' });
        return { error: null };
      } catch (error) {
        const msg = getAuthErrorMessage(error);
        if (ALLOW_LOCAL_AUTH) {
          const localRes = localAuthSignIn(set, email, password);
          if (!localRes.error) return localRes;
          if (isInfraAuthError(msg)) {
            return { error: `Supabase login failed (${msg}). ${localRes.error}` };
          }
        }
        return { error: msg };
      }
    },

    signUpWithPassword: async (email, password, username) => {
      if (FORCE_LOCAL_AUTH || !supabaseConfig.hasValidConfig) {
        if (ALLOW_LOCAL_AUTH) return localAuthSignUp(set, email, password, username);
        return { error: 'Authentication is not configured.', needsEmailConfirmation: false };
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0],
              avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(username || '')}&background=random`,
              full_name: username,
            },
          },
        });
        if (error) {
          if (ALLOW_LOCAL_AUTH) {
            const localRes = localAuthSignUp(set, email, password, username);
            if (!localRes.error) return localRes;
            if (isInfraAuthError(error.message)) {
              return { error: `Supabase signup failed (${error.message}). ${localRes.error}`, needsEmailConfirmation: false };
            }
          }
          return { error: error.message, needsEmailConfirmation: false };
        }
        if (data.user && data.session) {
          clearLocalSession();
          set({ session: data.session, user: mapSessionToUser(data.session), isAuthenticated: true, isLoading: false, authMode: 'supabase' });
          return { error: null, needsEmailConfirmation: false };
        }
        if (data.user && !data.session) {
          return { error: null, needsEmailConfirmation: true };
        }
        return { error: 'Signup failed. Please try again.', needsEmailConfirmation: false };
      } catch (error) {
        const msg = getAuthErrorMessage(error);
        if (ALLOW_LOCAL_AUTH) {
          const localRes = localAuthSignUp(set, email, password, username);
          if (!localRes.error) return localRes;
          return { error: `${msg} (Local auth also failed: ${localRes.error})`, needsEmailConfirmation: false };
        }
        return { error: msg, needsEmailConfirmation: false };
      }
    },

    resendSignupConfirmation: async (email) => {
      if (FORCE_LOCAL_AUTH || !supabaseConfig.hasValidConfig) {
        if (ALLOW_LOCAL_AUTH) return { error: null };
        return { error: 'Authentication is not configured.' };
      }
      const emailRedirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/auth/callback`
          : undefined;
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email,
          options: { emailRedirectTo }
        });
        if (error) return { error: error.message };
        return { error: null };
      } catch (error) {
        return { error: getAuthErrorMessage(error) };
      }
    },

    signOut: async () => {
      if (!FORCE_LOCAL_AUTH && supabaseConfig.hasValidConfig) {
        await supabase.auth.signOut();
      }
      clearLocalSession();
      set({
        session: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        authMode: supabaseConfig.hasValidConfig && !FORCE_LOCAL_AUTH ? 'supabase' : ALLOW_LOCAL_AUTH ? 'local' : 'supabase'
      });
    },

    updateUser: (updates) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),

    getCurrentUser: () => get().user,

    checkUser: () => {
      if (FORCE_LOCAL_AUTH || !supabaseConfig.hasValidConfig) {
        if (ALLOW_LOCAL_AUTH) {
          const found = readLocalSessionUser();
          if (found) {
            set({ session: null, user: mapLocalUserToUser(found), isAuthenticated: true, isLoading: false, authMode: 'local' });
            return;
          }
          set({ session: null, user: null, isAuthenticated: false, isLoading: false, authMode: 'local' });
          return;
        }
        set({ session: null, user: null, isAuthenticated: false, isLoading: false, authMode: 'supabase' });
        return;
      }
      if (!authUnsubscribe) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            clearLocalSession();
            set({ session, user: mapSessionToUser(session), isAuthenticated: true, isLoading: false, authMode: 'supabase' });
            return;
          }
          if (ALLOW_LOCAL_AUTH) {
            const localFound = readLocalSessionUser();
            if (localFound) {
              set({ session: null, user: mapLocalUserToUser(localFound), isAuthenticated: true, isLoading: false, authMode: 'local' });
              return;
            }
          }
          set({ session: null, user: null, isAuthenticated: false, isLoading: false, authMode: 'supabase' });
        });
        authUnsubscribe = () => data.subscription.unsubscribe();
      }

      supabase.auth
        .getSession()
        .then(({ data }) => {
          const session = data.session ?? null;
          if (session) {
            clearLocalSession();
            set({ session, user: mapSessionToUser(session), isAuthenticated: true, isLoading: false, authMode: 'supabase' });
            return;
          }
          if (ALLOW_LOCAL_AUTH) {
            const localFound = readLocalSessionUser();
            if (localFound) {
              set({ session: null, user: mapLocalUserToUser(localFound), isAuthenticated: true, isLoading: false, authMode: 'local' });
              return;
            }
          }
          set({ session: null, user: null, isAuthenticated: false, isLoading: false, authMode: 'supabase' });
        })
        .catch(() => {
          if (ALLOW_LOCAL_AUTH) {
            const localFound = readLocalSessionUser();
            if (localFound) {
              set({ session: null, user: mapLocalUserToUser(localFound), isAuthenticated: true, isLoading: false, authMode: 'local' });
              return;
            }
          }
          set({ session: null, user: null, isAuthenticated: false, isLoading: false, authMode: 'supabase' });
        });
    },

    loginAsGuest: () => {
      const guestUser: User = {
        id: 'guest_123',
        username: 'guest_user',
        name: 'Guest User',
        email: 'guest@example.com',
        avatar: 'https://ui-avatars.com/api/?name=Guest+User&background=random',
        level: 1,
        isVerified: false,
        followers: 0,
        following: 0,
        joinedDate: new Date().toISOString()
      };
      set({ user: guestUser, isAuthenticated: true, isLoading: false, session: null, authMode: 'guest' });
    }
  })
);
