// store/cart.store.ts - OPTIMIZED VERSION
import { CartCustomization, CartStore } from "@/type";
import { create } from "zustand";
import { 
    syncCartToServer, 
    getCartFromServer, 
    clearCartFromServer,
    getCurrentUser 
} from "@/lib/appwrite";

function areCustomizationsEqual(
    a: CartCustomization[] = [],
    b: CartCustomization[] = []
): boolean {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort((x, y) => x.id.localeCompare(y.id));
    const bSorted = [...b].sort((x, y) => x.id.localeCompare(y.id));
    return aSorted.every((item, idx) => item.id === bSorted[idx].id);
}

// ✅ FIX 1: Debounce sync để tránh gọi quá nhiều
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
async function debouncedSyncToServer(items: any[]) {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }
    
    syncTimeout = setTimeout(async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                await syncCartToServer(user.$id, items);
            }
        } catch (error) {
            console.error('Failed to sync cart:', error);
        }
    }, 1000); // ✅ Chờ 1s sau lần thay đổi cuối
}

export const useCartStore = create<CartStore>((set, get) => ({
    items: [],

    addItem: (item) => {
        const customizations = item.customizations ?? [];
        const existing = get().items.find(
            (i) =>
                i.id === item.id &&
                areCustomizationsEqual(i.customizations ?? [], customizations)
        );

        let newItems;
        if (existing) {
            newItems = get().items.map((i) =>
                i.id === item.id &&
                areCustomizationsEqual(i.customizations ?? [], customizations)
                    ? { ...i, quantity: i.quantity + 1 }
                    : i
            );
        } else {
            newItems = [...get().items, { ...item, quantity: 1, customizations }];
        }

        set({ items: newItems });
        debouncedSyncToServer(newItems); // ✅ Dùng debounced
    },

    removeItem: (id, customizations = []) => {
        const newItems = get().items.filter(
            (i) =>
                !(
                    i.id === id &&
                    areCustomizationsEqual(i.customizations ?? [], customizations)
                )
        );
        set({ items: newItems });
        debouncedSyncToServer(newItems);
    },

    increaseQty: (id, customizations = []) => {
        const newItems = get().items.map((i) =>
            i.id === id &&
            areCustomizationsEqual(i.customizations ?? [], customizations)
                ? { ...i, quantity: i.quantity + 1 }
                : i
        );
        set({ items: newItems });
        debouncedSyncToServer(newItems);
    },

    decreaseQty: (id, customizations = []) => {
        const newItems = get()
            .items.map((i) =>
                i.id === id &&
                areCustomizationsEqual(i.customizations ?? [], customizations)
                    ? { ...i, quantity: i.quantity - 1 }
                    : i
            )
            .filter((i) => i.quantity > 0);
        set({ items: newItems });
        debouncedSyncToServer(newItems);
    },

    clearCart: async () => {
        set({ items: [] });
        
        // ✅ Clear timeout trước khi clear cart
        if (syncTimeout) {
            clearTimeout(syncTimeout);
            syncTimeout = null;
        }
        
        try {
            const user = await getCurrentUser();
            if (user) {
                await clearCartFromServer(user.$id);
            }
        } catch (error) {
            console.error('Failed to clear cart from server:', error);
        }
    },

    loadCartFromServer: async () => {
        try {
            const user = await getCurrentUser();
            if (user) {
                const serverCart = await getCartFromServer(user.$id);
                set({ items: serverCart });
                console.log(`✅ Loaded ${serverCart.length} items from server`);
            }
        } catch (error) {
            console.error('Failed to load cart from server:', error);
        }
    },

    getTotalItems: () =>
        get().items.reduce((total, item) => total + item.quantity, 0),

    getTotalPrice: () =>
        get().items.reduce((total, item) => {
            const base = item.price;
            const customPrice =
                item.customizations?.reduce(
                    (s: number, c: CartCustomization) => s + c.price,
                    0
                ) ?? 0;
            return total + item.quantity * (base + customPrice);
        }, 0),
}));