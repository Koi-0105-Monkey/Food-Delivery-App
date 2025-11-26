import { Account, Avatars, Client, Databases, ID, Query, Storage } from 'react-native-appwrite';
import { CreateUserParams, GetMenuParams, SignInParams } from '@/type';

export const appwriteConfig = {
    endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!,
    projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!,
    platform: 'com.AKEshop.FoodDelivery',
    databaseId: '68629ae60038a7c61fe4',
    bucketId: '692334a700377dae1061',
    userCollectionId: 'users',
    categoriesCollectionId: '692315a6001ae62780a0',
    menuCollectionId: 'menu',
    customizationsCollectionId: 'customizations',
    menuCustomizationsCollectionId: 'menu_customizations',
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

export const createUser = async ({ email, password, name }: CreateUserParams) => {
    try {
        // Check if session exists and delete it
        try {
            await account.deleteSession('current');
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

        // Sign in the new user
        await signIn({ email, password });

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

        return userDocument;
    } catch (error: any) {
        console.error('Create user error:', error);

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
            await account.deleteSession('current');
        } catch (e) {
            // No active session, continue
        }

        // Create new session
        const session = await account.createEmailPasswordSession(email, password);

        if (!session) {
            throw new Error('Failed to create session');
        }

        return session;
    } catch (error: any) {
        console.error('Sign in error:', error);

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
        const currentAccount = await account.get();

        if (!currentAccount) {
            throw new Error('No active session');
        }

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        );

        if (!currentUser || currentUser.documents.length === 0) {
            throw new Error('User document not found');
        }

        return currentUser.documents[0];
    } catch (error: any) {
        console.error('Get current user error:', error);
        
        // If session expired or invalid, return null (not an error)
        if (error.code === 401 || error.message?.includes('session')) {
            return null;
        }

        throw new Error(error.message || 'Failed to get current user');
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