import { create } from 'zustand';
import { 
    saveUserAddress, 
    getUserAddress,
    getCurrentUser 
} from '@/lib/appwrite';

export interface Address {
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

interface AddressState {
    address: Address | null;
    isLoading: boolean;
    
    setAddress: (address: Address) => Promise<void>;
    fetchAddress: () => Promise<void>;
    clearAddress: () => void;
    getDisplayAddress: () => string;
}

export const useAddressStore = create<AddressState>((set, get) => ({
    address: null,
    isLoading: false,

    setAddress: async (address) => {
        try {
            set({ isLoading: true });

            // Lấy userId từ Appwrite
            const user = await getCurrentUser();
            if (!user) throw new Error('No user logged in');
            const userId = user.$id;

            // Save to Appwrite
            await saveUserAddress(userId, {
                street: address.street,
                city: address.city,
                country: address.country,
                fullAddress: address.fullAddress,
                isDefault: true,
            });

            set({ address, isLoading: false });
            console.log('✅ Address saved to server');
        } catch (error) {
            console.error('❌ Failed to save address:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    fetchAddress: async () => {
        try {
            set({ isLoading: true });

            // Lấy userId từ Appwrite
            const user = await getCurrentUser();
            if (!user) {
                console.log('⚠️ No user logged in, skipping address fetch');
                set({ address: null, isLoading: false });
                return;
            }

            const userId = user.$id;

            const addressDoc = await getUserAddress(userId);

            if (addressDoc) {
                const address: Address = {
                    street: addressDoc.street || '',
                    city: addressDoc.city,
                    country: addressDoc.country,
                    fullAddress: addressDoc.full_address, // snake_case from server
                };
                set({ address, isLoading: false });
                console.log('✅ Address loaded from server:', address.fullAddress);
            } else {
                set({ address: null, isLoading: false });
                console.log('⚠️ No address found for user');
            }
        } catch (error) {
            console.error('❌ Failed to fetch address:', error);
            set({ address: null, isLoading: false });
        }
    },

    clearAddress: () => set({ address: null }),

    getDisplayAddress: () => {
        const { address } = get();
        if (!address) return 'Set delivery address';
        
        if (address.city && address.country) {
            return `${address.city}, ${address.country}`;
        }
        
        return address.country || 'Set delivery address';
    },
}));