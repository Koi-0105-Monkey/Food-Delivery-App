import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';
import { CreateUserParams, GetMenuParams, SignInParams, User } from '@/type';

export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    platform: process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!,
    databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!,
    bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID!,
    userCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
    categoriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID!,
    menuCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MENU_COLLECTION_ID!,
    customizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CUSTOMIZATIONS_COLLECTION_ID!,
    menuCustomizationsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MENU_CUSTOMIZATIONS_COLLECTION_ID!,
    userAddressesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USER_ADDRESSES_COLLECTION_ID!,
    cartItemsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_CART_ITEMS_COLLECTION_ID!,
    ordersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID!,
};

export const client = new Client();

client
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectId)
    .setPlatform(appwriteConfig.platform);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
const avatars = new Avatars(client);

const waitForSession = (ms: number = 500) => 
    new Promise(resolve => setTimeout(resolve, ms));

// ========== AUTH FUNCTIONS ==========

export const createUser = async ({ email, password, name }: CreateUserParams) => {
    try {
        // Check existing session
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No session
        }

        const newAccount = await account.create(
            ID.unique(),
            email,
            password,
            name
        );

        if (!newAccount) {
            throw new Error('Failed to create account');
        }

        console.log('✅ Account created:', newAccount.$id);

        const session = await account.createEmailPasswordSession(email, password);
        console.log('✅ Session created:', session.$id);

        await waitForSession();

        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        const avatarUrl = avatars.getInitialsURL(name);

        // ✅ Create user with default role
        const userDocument = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            {
                email,
                name,
                accountId: newAccount.$id,
                avatar: avatarUrl.toString(),
                role: 'user', // 👈 Default role
            }
        );

        console.log('✅ User document created:', userDocument.$id);

        return userDocument;
    } catch (error: any) {
        console.error('❌ Create user error:', error);

        if (error.code === 409) {
            throw new Error('user_already_exists');
        }
        if (error.message?.includes('Invalid email')) {
            throw new Error('Invalid email format');
        }
        if (error.message?.includes('password')) {
            throw new Error('Password must be at least 8 characters');
        }

        throw new Error(error.message || 'Failed to create user');
    }
};

export const signIn = async ({ email, password }: SignInParams) => {
    try {
        // Delete existing session
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No session
        }

        // Create session
        const session = await account.createEmailPasswordSession(email, password);

        if (!session) {
            throw new Error('Failed to create session');
        }

        console.log('✅ Session created:', session.$id);

        await waitForSession();

        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        return session;
    } catch (error: any) {
        console.error('❌ Sign in error:', error);

        // ✅ Better error messages
        if (error.code === 401 || error.message?.includes('Invalid credentials')) {
            throw new Error('Invalid email or password');
        }
        if (error.message?.includes('user_not_found')) {
            throw new Error('No account found with this email');
        }
        if (error.message?.includes('user_blocked')) {
            throw new Error('Account has been blocked');
        }

        throw new Error(error.message || 'Failed to sign in');
    }
};

export const getCurrentUser = async () => {
    try {
        const currentAccount = await account.get();

        if (!currentAccount) {
            return null;
        }

        console.log('✅ Account found:', currentAccount.email);

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser || currentUser.documents.length === 0) {
            console.log('⚠️ User document not found for account:', currentAccount.$id);
            return null;
        }

        const userData = currentUser.documents[0] as User;
        
        console.log('✅ User document found:', userData.email);
        console.log('🔐 User role:', userData.role || 'user');

        return userData;
    } catch (error: any) {
        if (error.code === 401 || error.message?.includes('guests')) {
            return null;
        }
        
        if (error.message && !error.message.includes('session')) {
            console.error('❌ Get current user error:', error.message);
        }

        return null;
    }
};

// ========== MENU FUNCTIONS ==========

export const getMenu = async ({ category, query, tabs }: GetMenuParams) => {
    try {
        const queries: string[] = [];

        if (category) queries.push(Query.equal('categories', category));
        if (query) queries.push(Query.search('name', query));

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries
        );

        let results = menus.documents;

        if (tabs) {
            results = results.filter((item: any) => {
                const itemTabs = item.tabs || '';
                return itemTabs.includes(tabs);
            });
        }

        return results;
    } catch (error: any) {
        console.error('Get menu error:', error);
        throw new Error(error.message || 'Failed to fetch menu');
    }
};

export const getCategories = async () => {
    try {
        const categories = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.categoriesCollectionId
        );

        return categories.documents;
    } catch (error: any) {
        console.error('Get categories error:', error);
        throw new Error(error.message || 'Failed to fetch categories');
    }
};

// ========== ADDRESS FUNCTIONS ==========

export const getUserAddress = async (userId: string) => {
    try {
        const addresses = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            [Query.equal('user_id', userId)]
        );

        if (addresses.documents.length === 0) return null;

        return addresses.documents[0];
    } catch (error: any) {
        console.error('❌ Get address error:', error);
        return null;
    }
};

// ========== CART FUNCTIONS ==========
export const syncCartToServerLegacy = async (userId: string, cartItems: any[]) => {
    try {
        // Delete all existing cart items for this user
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        for (const item of existing.documents) {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.cartItemsCollectionId,
                item.$id
            );
        }

        // Create new cart items
        const promises = cartItems.map((item) =>
            databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.cartItemsCollectionId,
                ID.unique(),
                {
                    user_id: userId,
                    menu_id: item.id,
                    name: item.name,
                    price: item.price,
                    image_url: item.image_url,
                    quantity: item.quantity,
                    customizations: JSON.stringify(item.customizations || []),
                }
            )
        );

        await Promise.all(promises);
        console.log('✅ Cart synced to server');
    } catch (error: any) {
        console.error('❌ Sync cart error:', error);
        throw new Error(error.message || 'Failed to sync cart');
    }
};

export const getCartFromServerLegacy = async (userId: string) => {
    try {
        const cartItems = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        // Convert to cart format
        return cartItems.documents.map((doc: any) => ({
            id: doc.menu_id,
            name: doc.name,
            price: doc.price,
            image_url: doc.image_url,
            quantity: doc.quantity,
            customizations: JSON.parse(doc.customizations || '[]'),
        }));
    } catch (error: any) {
        console.error('❌ Get cart error:', error);
        return [];
    }
};

export const clearCartFromServerLegacy = async (userId: string) => {
    try {
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        for (const item of existing.documents) {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.cartItemsCollectionId,
                item.$id
            );
        }

        console.log('✅ Cart cleared from server');
    } catch (error: any) {
        console.error('❌ Clear cart error:', error);
    }
};

// ========== USER PROFILE FUNCTIONS ==========
export const updateUserProfile = async ({ 
    userId,
    name, 
    phone, 
    avatarUri 
}: {
    userId: string;
    name: string;
    phone: string;
    avatarUri: string;
}): Promise<User> => {
    try {
        const userDocId = userId;
        let finalAvatarUrl = avatarUri;

        // 🔥 FIX: If avatar is local file (from image picker), upload to storage
        if (avatarUri.startsWith('file://')) {
            console.log('📤 Uploading new avatar...');
            
            const response = await fetch(avatarUri);
            const blob = await response.blob();
            
            // Create unique file ID
            const fileId = ID.unique();
            
            // Upload file using InputFile
            const file = await storage.createFile(
                appwriteConfig.bucketId,
                fileId,
                {
                    name: `avatar-${userId}-${Date.now()}.jpg`,
                    type: 'image/jpeg',
                    size: blob.size,
                    uri: avatarUri,
                }
            );

            // 🔥 FIX: Get proper view URL with project parameter
            finalAvatarUrl = `${appwriteConfig.endpoint}/storage/buckets/${appwriteConfig.bucketId}/files/${file.$id}/view?project=${appwriteConfig.projectId}`;

            console.log('✅ Avatar uploaded successfully:', finalAvatarUrl);
        }

        // Update user document
        const updatedDoc = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userDocId,
            {
                name,
                phone,
                avatar: finalAvatarUrl,
            }
        );

        console.log('✅ Profile updated successfully');
        return updatedDoc as User;
    } catch (error: any) {
        console.error('❌ Update profile error:', error);
        throw new Error(error.message || 'Failed to update profile');
    }
};

// ========== ADDRESS FUNCTIONS - MULTI ADDRESS SUPPORT ==========

/**
 * Lấy tất cả địa chỉ của user
 */
export const getUserAddresses = async (userId: string) => {
    try {
        const addresses = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            [Query.equal('user_id', userId)]
        );

        return addresses.documents;
    } catch (error: any) {
        console.error('❌ Get addresses error:', error);
        return [];
    }
};

/**
 * Tạo unique key cho cart item (menu_id + customizations)
 */
function getCartItemKey(menuId: string, customizations: any[] = []) {
    const customIds = customizations
        .map(c => c.id)
        .sort()
        .join(',');
    return `${menuId}|${customIds}`;
}

/**
 * Sync giỏ hàng lên server (SMART SYNC - chỉ update thay đổi)
 */
export const syncCartToServer = async (userId: string, cartItems: any[]) => {
    try {
        // Get existing cart from server
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        // Create map of existing items
        const existingMap = new Map();
        for (const doc of existing.documents) {
            const key = getCartItemKey(doc.menu_id, JSON.parse(doc.customizations || '[]'));
            existingMap.set(key, doc);
        }

        // Create map of new items
        const newMap = new Map();
        for (const item of cartItems) {
            const key = getCartItemKey(item.id, item.customizations);
            newMap.set(key, item);
        }

        // DELETE items not in cart anymore
        for (const [key, doc] of existingMap) {
            if (!newMap.has(key)) {
                await databases.deleteDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.cartItemsCollectionId,
                    doc.$id
                );
                console.log(`🗑️  Deleted cart item: ${doc.name}`);
            }
        }

        // UPDATE or CREATE items
        for (const [key, item] of newMap) {
            const existingDoc = existingMap.get(key);

            if (existingDoc) {
                // UPDATE quantity if changed
                if (existingDoc.quantity !== item.quantity) {
                    await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.cartItemsCollectionId,
                        existingDoc.$id,
                        {
                            quantity: item.quantity,
                            price: item.price,
                        }
                    );
                    console.log(`🔄 Updated ${item.name}: qty ${existingDoc.quantity} → ${item.quantity}`);
                }
            } else {
                // CREATE new item
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.cartItemsCollectionId,
                    ID.unique(),
                    {
                        user_id: userId,
                        menu_id: item.id,
                        name: item.name,
                        price: item.price,
                        image_url: item.image_url,
                        quantity: item.quantity,
                        customizations: JSON.stringify(item.customizations || []),
                    }
                );
                console.log(`➕ Added ${item.name} (qty: ${item.quantity})`);
            }
        }

        console.log('✅ Cart synced to server');
    } catch (error: any) {
        console.error('❌ Sync cart error:', error);
        throw new Error(error.message || 'Failed to sync cart');
    }
};

/**
 * Lấy giỏ hàng từ server
 */
export const getCartFromServer = async (userId: string) => {
    try {
        const cartItems = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        // Convert to cart format
        return cartItems.documents.map((doc: any) => ({
            id: doc.menu_id,
            name: doc.name,
            price: doc.price,
            image_url: doc.image_url,
            quantity: doc.quantity,
            customizations: JSON.parse(doc.customizations || '[]'),
        }));
    } catch (error: any) {
        console.error('❌ Get cart error:', error);
        return [];
    }
};

/**
 * Xóa toàn bộ giỏ hàng trên server
 */
export const clearCartFromServer = async (userId: string) => {
    try {
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)]
        );

        for (const item of existing.documents) {
            await databases.deleteDocument(
                appwriteConfig.databaseId,
                appwriteConfig.cartItemsCollectionId,
                item.$id
            );
        }

        console.log('✅ Cart cleared from server');
    } catch (error: any) {
        console.error('❌ Clear cart error:', error);
    }
};

/**
 * Tạo địa chỉ mới
 */
export const saveUserAddress = async (userId: string, address: {
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    isDefault?: boolean;
}) => {
    try {
        // Nếu là địa chỉ đầu tiên hoặc set là default, unset các địa chỉ default khác
        if (address.isDefault) {
            const existingAddresses = await getUserAddresses(userId);
            
            // Unset all existing defaults
            for (const addr of existingAddresses) {
                if (addr.is_default) {
                    await databases.updateDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.userAddressesCollectionId,
                        addr.$id,
                        { is_default: false }
                    );
                }
            }
        }

        // Create new address
        const doc = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            ID.unique(),
            {
                user_id: userId,
                street: address.street,
                city: address.city,
                country: address.country,
                full_address: address.fullAddress,
                is_default: address.isDefault ?? false,
            }
        );
        
        return doc;
    } catch (error: any) {
        console.error('❌ Save address error:', error);
        throw new Error(error.message || 'Failed to save address');
    }
};

/**
 * Cập nhật địa chỉ
 */
export const updateUserAddress = async (addressId: string, address: {
    street?: string;
    city?: string;
    country?: string;
    fullAddress?: string;
}) => {
    try {
        const updateData: any = {};
        
        if (address.street !== undefined) updateData.street = address.street;
        if (address.city !== undefined) updateData.city = address.city;
        if (address.country !== undefined) updateData.country = address.country;
        if (address.fullAddress !== undefined) updateData.full_address = address.fullAddress;

        const doc = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId,
            updateData
        );
        
        return doc;
    } catch (error: any) {
        console.error('❌ Update address error:', error);
        throw new Error(error.message || 'Failed to update address');
    }
};

/**
 * Xóa địa chỉ
 */
export const deleteUserAddress = async (addressId: string) => {
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId
        );
        
        console.log('✅ Address deleted');
    } catch (error: any) {
        console.error('❌ Delete address error:', error);
        throw new Error(error.message || 'Failed to delete address');
    }
};

/**
 * Set địa chỉ làm default
 */
export const setDefaultAddress = async (userId: string, addressId: string) => {
    try {
        // Unset all existing defaults
        const existingAddresses = await getUserAddresses(userId);
        
        for (const addr of existingAddresses) {
            if (addr.is_default && addr.$id !== addressId) {
                await databases.updateDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.userAddressesCollectionId,
                    addr.$id,
                    { is_default: false }
                );
            }
        }

        // Set new default
        await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            addressId,
            { is_default: true }
        );
        
        console.log('✅ Default address set');
    } catch (error: any) {
        console.error('❌ Set default address error:', error);
        throw new Error(error.message || 'Failed to set default address');
    }
};