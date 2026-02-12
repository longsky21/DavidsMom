import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  token: string | null;
  childToken: string | null;
  user: {
    id: string;
    username: string;
    phone: string;
  } | null;
  setToken: (token: string) => void;
  setChildToken: (token: string | null) => void;
  setUser: (user: any) => void;
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
