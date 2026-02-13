import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  phone?: string;
  avatar_url?: string;
}

export interface UserState {
  token: string | null;
  childToken: string | null;
  user: User | null;
  setToken: (token: string) => void;
  setChildToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const useStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      childToken: null,
      user: null,
      setToken: (token) => set({ token }),
      setChildToken: (childToken) => set({ childToken }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, childToken: null, user: null }),
    }),
    {
      name: 'davids-mom-storage',
    }
  )
);

export default useStore;
