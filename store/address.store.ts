import { create } from 'zustand';
import { 
    saveUserAddress, 
    getUserAddresses,
    updateUserAddress,
    deleteUserAddress,
    setDefaultAddress,
    getCurrentUser 
} from '@/lib/appwrite';

export interface Address {
    $id?: string;
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    isDefault: boolean;
    coordinates?: {
        latitude: number;
        longitude: number;
    };
}

interface AddressState {
    addresses: Address[];
    defaultAddress: Address | null;
    isLoading: boolean;
    
    addAddress: (address: Omit<Address, '$id' | 'isDefault'>) => Promise<void>;
    updateAddress: (addressId: string, address: Partial<Address>) => Promise<void>;
    deleteAddress: (addressId: string) => Promise<void>;
    setAsDefault: (addressId: string) => Promise<void>;
    fetchAddresses: () => Promise<void>;
    clearAddresses: () => void;
    getDisplayAddress: () => string;
}

export const useAddressStore = create<AddressState>((set, get) => ({
    addresses: [],
    defaultAddress: null,
    isLoading: false,

    addAddress: async (address) => {
        try {
            set({ isLoading: true });

            const user = await getCurrentUser();
            if (!user) throw new Error('No user logged in');
            const userId = user.$id;

            // Check if this is the first address, auto set as default
            const existingAddresses = get().addresses;
            const isFirstAddress = existingAddresses.length === 0;

            await saveUserAddress(userId, {
                street: address.street,
                city: address.city,
                country: address.country,
                fullAddress: address.fullAddress,
                isDefault: isFirstAddress, // First address is default
            });

            // Refresh addresses
            await get().fetchAddresses();
            
            console.log('✅ Address added successfully');
        } catch (error) {
            console.error('❌ Failed to add address:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    updateAddress: async (addressId, address) => {
        try {
            set({ isLoading: true });

            const user = await getCurrentUser();
            if (!user) throw new Error('No user logged in');

            await updateUserAddress(addressId, address);

            // Refresh addresses
            await get().fetchAddresses();
            
            console.log('✅ Address updated successfully');
        } catch (error) {
            console.error('❌ Failed to update address:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    deleteAddress: async (addressId) => {
        try {
            set({ isLoading: true });

            await deleteUserAddress(addressId);

            // Refresh addresses
            await get().fetchAddresses();
            
            console.log('✅ Address deleted successfully');
        } catch (error) {
            console.error('❌ Failed to delete address:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    setAsDefault: async (addressId) => {
        try {
            set({ isLoading: true });

            const user = await getCurrentUser();
            if (!user) throw new Error('No user logged in');
            const userId = user.$id;

            await setDefaultAddress(userId, addressId);

            // Refresh addresses
            await get().fetchAddresses();
            
            console.log('✅ Default address updated');
        } catch (error) {
            console.error('❌ Failed to set default address:', error);
            set({ isLoading: false });
            throw error;
        }
    },

    fetchAddresses: async () => {
        try {
            set({ isLoading: true });

            const user = await getCurrentUser();
            if (!user) {
                console.log('⚠️ No user logged in, skipping address fetch');
                set({ addresses: [], defaultAddress: null, isLoading: false });
                return;
            }

            const userId = user.$id;
            const addressDocs = await getUserAddresses(userId);

            if (addressDocs && addressDocs.length > 0) {
                const addresses: Address[] = addressDocs.map((doc: any) => ({
                    $id: doc.$id,
                    street: doc.street || '',
                    city: doc.city,
                    country: doc.country,
                    fullAddress: doc.full_address,
                    isDefault: doc.is_default || false,
                }));

                const defaultAddr = addresses.find(a => a.isDefault) || null;

                set({ 
                    addresses, 
                    defaultAddress: defaultAddr,
                    isLoading: false 
                });
                
                console.log(`✅ Loaded ${addresses.length} addresses from server`);
            } else {
                set({ 
                    addresses: [], 
                    defaultAddress: null,
                    isLoading: false 
                });
                console.log('⚠️ No addresses found for user');
            }
        } catch (error) {
            console.error('❌ Failed to fetch addresses:', error);
            set({ addresses: [], defaultAddress: null, isLoading: false });
        }
    },

    clearAddresses: () => set({ addresses: [], defaultAddress: null }),

    getDisplayAddress: () => {
        const { defaultAddress } = get();
        if (!defaultAddress) return 'Set delivery address';
        
        // Return full address
        return defaultAddress.fullAddress || 'Set delivery address';
    },
}));