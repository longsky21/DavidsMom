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
  childNickname: string | null;
  setToken: (token: string) => void;
  setChildToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setChildNickname: (nickname: string | null) => void;
  logout: () => void;
}

const useStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      childToken: null,
      user: null,
      childNickname: null,
      setToken: (token) => set({ token }),
      setChildToken: (childToken) => set({ childToken }),
      setUser: (user) => set({ user }),
      setChildNickname: (childNickname) => set({ childNickname }),
      logout: () => set({ token: null, childToken: null, user: null, childNickname: null }),
    }),
    {
      name: 'davids-mom-storage',
    }
  )
);

export default useStore;
