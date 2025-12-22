// store/auth.store.ts - OPTIMIZED VERSION
import { create } from 'zustand';
import { User } from '@/type';
import { getCurrentUser } from '@/lib/appwrite';

type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean;
    lastFetchTime: number; // ✅ FIX 4: Track last fetch để tránh fetch lại liên tục

    setIsAuthenticated: (value: boolean) => void;
    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;

    fetchAuthenticatedUser: () => Promise<void>;
    checkAdminRole: () => boolean;
}

const CACHE_DURATION = 60000; // ✅ 60 seconds cache

const useAuthStore = create<AuthState>((set, get) => ({
    isAuthenticated: false,
    user: null,
    isLoading: true,
    isAdmin: false,
    lastFetchTime: 0,

    setIsAuthenticated: (value) => set({ isAuthenticated: value }),
    
    setUser: (user) => {
        set({ 
            user,
            isAdmin: user?.role === 'admin',
            lastFetchTime: Date.now() // ✅ Update cache time
        });
    },
    
    setLoading: (value) => set({ isLoading: value }),

    fetchAuthenticatedUser: async () => {
        // ✅ FIX 4: Check cache trước khi fetch
        const now = Date.now();
        const { lastFetchTime, user } = get();
        
        if (user && now - lastFetchTime < CACHE_DURATION) {
            console.log('✅ Using cached user data');
            set({ isLoading: false });
            return;
        }

        set({ isLoading: true });

        try {
            const user = await getCurrentUser();

            if (user) {
                const userWithRole = user as User;
                
                set({ 
                    isAuthenticated: true, 
                    user: userWithRole,
                    isAdmin: userWithRole.role === 'admin',
                    isLoading: false,
                    lastFetchTime: Date.now() // ✅ Save cache time
                });
                
                console.log('✅ User authenticated:', userWithRole.email);
            } else {
                set({ 
                    isAuthenticated: false, 
                    user: null,
                    isAdmin: false,
                    isLoading: false,
                    lastFetchTime: 0
                });
            }
        } catch (e) {
            console.error('❌ fetchAuthenticatedUser error:', e);
            set({ 
                isAuthenticated: false, 
                user: null,
                isAdmin: false,
                isLoading: false,
                lastFetchTime: 0
            });
        }
    },

    checkAdminRole: () => {
        const { user } = get();
        return user?.role === 'admin';
    }
}));

export default useAuthStore;