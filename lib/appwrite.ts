import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';
import { CreateUserParams, GetMenuParams, SignInParams, User } from '@/type';


export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    platform: 'com.AKEshop.myfoodapp',
    databaseId: '6927c468001041ff0fc7',
    bucketId: '6927c9b60006fc984a45',
    userCollectionId: 'users',
    categoriesCollectionId: 'categories',
    menuCollectionId: 'menu',
    customizationsCollectionId: 'custamizations',
    menuCustomizationsCollectionId: 'menu_customizations',
    // NEW: Collections for address and cart
    userAddressesCollectionId: 'user_addresses',
    cartItemsCollectionId: 'cart_items',
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

// Helper function to wait for session to be ready
const waitForSession = (ms: number = 500) => 
    new Promise(resolve => setTimeout(resolve, ms));

export const createUser = async ({ email, password, name }: CreateUserParams) => {
    try {
        // Check if session exists and delete it
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No active session, continue
        }

        // Create account
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

        // Sign in the new user
        const session = await account.createEmailPasswordSession(email, password);
        console.log('✅ Session created:', session.$id);

        // Wait for session to be fully established
        await waitForSession();

        // Verify session is active
        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        // Create avatar
        const avatarUrl = avatars.getInitialsURL(name);

        // Create user document
        const userDocument = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            {
                email,
                name,
                accountId: newAccount.$id,
                avatar: avatarUrl.toString(),
            }
        );

        console.log('✅ User document created:', userDocument.$id);

        return userDocument;
    } catch (error: any) {
        console.error('❌ Create user error:', error);

        // Handle specific errors
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
        // Delete any existing session first
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                await account.deleteSession(session.$id);
            }
        } catch (e) {
            // No active session, continue
        }

        // Create new session
        const session = await account.createEmailPasswordSession(email, password);

        if (!session) {
            throw new Error('Failed to create session');
        }

        console.log('✅ Session created:', session.$id);

        // Wait for session to be fully established
        await waitForSession();

        // Verify session is active
        const currentAccount = await account.get();
        console.log('✅ Account verified:', currentAccount.email);

        return session;
    } catch (error: any) {
        console.error('❌ Sign in error:', error);

        // Handle specific errors
        if (error.code === 401) {
            throw new Error('Invalid credentials');
        }
        if (error.message?.includes('user_not_found')) {
            throw new Error('user_not_found');
        }
        if (error.message?.includes('user_blocked')) {
            throw new Error('user_blocked');
        }

        throw new Error(error.message || 'Failed to sign in');
    }
};

export const getCurrentUser = async () => {
    try {
        // First verify we have an active session
        const currentAccount = await account.get();

        if (!currentAccount) {
            console.log('❌ No account found');
            return null;
        }

        console.log('✅ Account found:', currentAccount.email);

        // Then get user document
        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser || currentUser.documents.length === 0) {
            console.log('❌ User document not found');
            return null;
        }

        console.log('✅ User document found:', currentUser.documents[0].email);
        return currentUser.documents[0];
    } catch (error: any) {
        console.error('❌ Get current user error:', error.message);
        
        // If session expired or invalid, return null (not an error)
        if (error.code === 401 || error.message?.includes('session') || error.message?.includes('guests')) {
            return null;
        }

        return null;
    }
};

export const getMenu = async ({ category, query }: GetMenuParams) => {
    try {
        const queries: string[] = [];

        if (category) queries.push(Query.equal('categories', category));
        if (query) queries.push(Query.search('name', query));

        const menus = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.menuCollectionId,
            queries
        );

        return menus.documents;
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

export const saveUserAddress = async (userId: string, address: {
    street: string;
    city: string;
    country: string;
    fullAddress: string;
    isDefault?: boolean;
}) => {
    try {
        // Check if user already has an address
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            [Query.equal('user_id', userId)] // snake_case
        );

        // If exists, update. If not, create.
        if (existing.documents.length > 0) {
            const doc = await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.userAddressesCollectionId,
                existing.documents[0].$id,
                {
                    street: address.street,
                    city: address.city,
                    country: address.country,
                    full_address: address.fullAddress, // snake_case
                    is_default: address.isDefault ?? true, // snake_case
                }
            );
            return doc;
        } else {
            const doc = await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.userAddressesCollectionId,
                ID.unique(),
                {
                    user_id: userId, // snake_case
                    street: address.street,
                    city: address.city,
                    country: address.country,
                    full_address: address.fullAddress, // snake_case
                    is_default: address.isDefault ?? true, // snake_case
                }
            );
            return doc;
        }
    } catch (error: any) {
        console.error('❌ Save address error:', error);
        throw new Error(error.message || 'Failed to save address');
    }
};

export const getUserAddress = async (userId: string) => {
    try {
        const addresses = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userAddressesCollectionId,
            [Query.equal('user_id', userId)] // snake_case
        );

        if (addresses.documents.length === 0) return null;

        return addresses.documents[0];
    } catch (error: any) {
        console.error('❌ Get address error:', error);
        return null;
    }
};

// ========== CART FUNCTIONS ==========

export const syncCartToServer = async (userId: string, cartItems: any[]) => {
    try {
        // Delete all existing cart items for this user
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)] // snake_case
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
                    user_id: userId, // snake_case
                    menu_id: item.id, // snake_case
                    name: item.name,
                    price: item.price,
                    image_url: item.image_url, // snake_case
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

export const getCartFromServer = async (userId: string) => {
    try {
        const cartItems = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)] // snake_case
        );

        // Convert to cart format
        return cartItems.documents.map((doc: any) => ({
            id: doc.menu_id, // snake_case
            name: doc.name,
            price: doc.price,
            image_url: doc.image_url, // snake_case
            quantity: doc.quantity,
            customizations: JSON.parse(doc.customizations || '[]'),
        }));
    } catch (error: any) {
        console.error('❌ Get cart error:', error);
        return [];
    }
};

export const clearCartFromServer = async (userId: string) => {
    try {
        const existing = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.cartItemsCollectionId,
            [Query.equal('user_id', userId)] // snake_case
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

// 👇 HÀM NÀY ĐÃ ĐƯỢC SỬA: Loại bỏ listDocuments và sử dụng Document ID (userId) trực tiếp để update.
export const updateUserProfile = async ({ 
    userId, // Lúc này là Document ID
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
        const userDocId = userId; // Sử dụng userId là Document ID để cập nhật

        let finalAvatarUrl = avatarUri;

        // Nếu avatar là local file (từ image picker), upload lên storage
        if (avatarUri.startsWith('file://')) {
            console.log('📤 Uploading new avatar...');
            
            const response = await fetch(avatarUri);
            const blob = await response.blob();
            
            // Upload file
            const file = await storage.createFile(
                appwriteConfig.bucketId,
                ID.unique(),
                {
                    name: `avatar-${userId}-${Date.now()}.jpg`,
                    type: 'image/jpeg',
                    size: blob.size,
                    uri: avatarUri,
                }
            );

            // Lấy URL để view
            finalAvatarUrl = storage.getFileView(
                appwriteConfig.bucketId, 
                file.$id
            ).toString();

            console.log('✅ Avatar uploaded successfully');
        }

        // Update user document với tất cả thông tin bằng Document ID
        const updatedDoc = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userDocId, // Sử dụng Document ID để update
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