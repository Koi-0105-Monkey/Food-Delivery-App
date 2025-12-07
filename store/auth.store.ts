import { create } from 'zustand';
import { User } from '@/type';
import { getCurrentUser } from '@/lib/appwrite';

type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean; // 👈 NEW

    setIsAuthenticated: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;

    fetchAuthenticatedUser: () => Promise<void>;
    checkAdminRole: () => boolean; // 👈 NEW
}

const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    isAdmin: false,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }),
    
    setUser: (user) => {
        set({ 
            user,
            isAdmin: user?.role === 'admin' // ✅ Auto-detect admin
        });
    },
    
    setLoading: (value) => set({ isLoading: value }),

    fetchAuthenticatedUser: async () => {
        set({ isLoading: true });

        try {
            const user = await getCurrentUser();

            if (user) {
                const userWithRole = user as User;
                
                set({ 
                    isAuthenticated: true, 
                    user: userWithRole,
                    isAdmin: userWithRole.role === 'admin', // ✅ Check role
                    isLoading: false
                });
                
                console.log('✅ User authenticated:', userWithRole.email);
                console.log('🔐 Role:', userWithRole.role || 'user');
            } else {
                set({ 
                    isAuthenticated: false, 
                    user: null,
                    isAdmin: false,
                    isLoading: false 
                });
                console.log('ℹ️  No active session');
            }
        } catch (e) {
            console.error('❌ fetchAuthenticatedUser error:', e);
            set({ 
                isAuthenticated: false, 
                user: null,
                isAdmin: false,
                isLoading: false 
            });
        }
    },

    // ✅ Helper function to check admin
    checkAdminRole: () => {
        const { user } = get();
        return user?.role === 'admin';
    }
}));

export default useAuthStore;