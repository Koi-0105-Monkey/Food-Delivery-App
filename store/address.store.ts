import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    setAddress: (address: Address) => void;
    clearAddress: () => void;
    getDisplayAddress: () => string;
}

export const useAddressStore = create<AddressState>()(
    persist(
        (set, get) => ({
            address: null,

            setAddress: (address) => set({ address }),

            clearAddress: () => set({ address: null }),

            getDisplayAddress: () => {
                const { address } = get();
                if (!address) return 'Croatia'; // Default
                
                // Hiển thị city, country (ngắn gọn)
                if (address.city && address.country) {
                    return `${address.city}, ${address.country}`;
                }
                
                return address.country || 'Croatia';
            },
        }),
        {
            name: 'address-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);