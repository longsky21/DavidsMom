import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  token: string | null;
  user: {
    id: string;
    name: string;
    phone: string;
  } | null;
  setToken: (token: string) => void;
  setUser: (user: any) => void;
  logout: () => void;
}

const useStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setToken: (token) => set({ token }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'davids-mom-storage',
    }
  )
);

export default useStore;
