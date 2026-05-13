'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUserDto } from '@ged/types';

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserDto | null;
  setSession: (payload: {
    accessToken: string;
    refreshToken: string;
    user: AuthUserDto;
  }) => void;
  clear: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      setSession: ({ accessToken, refreshToken, user }) =>
        set({ accessToken, refreshToken, user }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
    }),
    { name: 'ged-auth' },
  ),
);
