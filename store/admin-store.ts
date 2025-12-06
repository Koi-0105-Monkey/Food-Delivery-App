// store/admin.store.ts
import { create } from 'zustand';

interface AdminState {
    isAdminAuthenticated: boolean;
    adminEmail: string | null;
    
    setAdminAuth: (value: boolean, email?: string) => void;
    logout: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
    isAdminAuthenticated: false,
    adminEmail: null,
    
    setAdminAuth: (value, email) => set({ 
        isAdminAuthenticated: value,
        adminEmail: email || null 
    }),
    
    logout: () => set({ 
        isAdminAuthenticated: false,
        adminEmail: null 
    }),
}));