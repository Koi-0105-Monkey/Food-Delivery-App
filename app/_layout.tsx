// ⚠️ CRITICAL: Import crypto polyfills FIRST before any other imports
// This must be at the very top to ensure crypto functions are available for Web3
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

// Verify polyfill is loaded
if (__DEV__) {
  if (typeof global.crypto !== 'undefined' && typeof global.crypto.getRandomValues === 'function') {
    console.log('✅ crypto.getRandomValues polyfill loaded successfully');
  } else {
    console.error('❌ crypto.getRandomValues polyfill NOT loaded!');
  }
}

import { View, Text, Modal, TouchableOpacity, Alert } from "react-native";
import { SplashScreen, Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from 'expo-font';
import { useEffect, useState } from "react";

import './globals.css';
import * as Sentry from '@sentry/react-native';
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";
import { client, appwriteConfig, signOut } from "@/lib/appwrite"; // Import appwrite client

Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',
  enableAutoPerformanceTracing: true,
  enableCaptureFailedRequests: true,
  tracesSampleRate: 1.0,
});

function RootLayoutComponent() {
  const { isLoading, fetchAuthenticatedUser, user, isAdmin, setUser, setIsAuthenticated } = useAuthStore();
  const { loadCartFromServer } = useCartStore();
  const router = useRouter();
  const segments = useSegments();

  // 🚫 BAN STATE
  const [isBanned, setIsBanned] = useState(false);
  const [banMessage, setBanMessage] = useState('');

  const [fontsLoaded, error] = useFonts({
    "QuickSand-Bold": require('../assets/fonts/Quicksand-Bold.ttf'),
    "QuickSand-Medium": require('../assets/fonts/Quicksand-Medium.ttf'),
    "QuickSand-Regular": require('../assets/fonts/Quicksand-Regular.ttf'),
    "QuickSand-SemiBold": require('../assets/fonts/Quicksand-SemiBold.ttf'),
    "QuickSand-Light": require('../assets/fonts/Quicksand-Light.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded, error]);

  useEffect(() => {
    fetchAuthenticatedUser();
  }, []);

  // ✅ AUTO REDIRECT ADMIN ngay khi vào app
  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) {
        console.log('🔐 Admin detected, auto redirecting to dashboard...');
        router.replace('/admin/dashboard');
      }

      // Load cart for regular users
      if (!isAdmin) {
        loadCartFromServer();
      }
    }
  }, [user, isAdmin, isLoading]);

  // 🚫 GLOBAL BAN CHECK & REALTIME LISTENER
  useEffect(() => {
    if (!user?.$id) return;

    // 1. Initial Check
    const checkBanStatus = (userData: any) => {
      if (userData?.banExpiresAt && new Date(userData.banExpiresAt) > new Date()) {
        const banDate = new Date(userData.banExpiresAt);
        const isPermanent = banDate.getFullYear() > 3000;
        const msg = isPermanent
          ? 'Your account has been permanently banned.'
          : `Your account is banned until ${banDate.toLocaleDateString()} ${banDate.toLocaleTimeString()}.`;

        setBanMessage(msg);
        setIsBanned(true);
      } else {
        setIsBanned(false);
      }
    };

    // 2. Realtime Subscription & Navigation Check
    const channel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents.${user.$id}`;

    // Check on mount and when user changes
    checkBanStatus(user);

    const unsubscribe = client.subscribe(channel, (response) => {
      if (response.events.includes('databases.*.documents.*.update')) {
        console.log('🔔 User document updated', response.payload);
        checkBanStatus(response.payload);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.$id]);

  // ✅ CHECK BAN ON TAB SWITCH (Home, Search, Cart, Settings)
  const pathname = useSegments();
  useEffect(() => {
    if (!user?.$id) return;

    // Check ban status whenever user navigates to a new tab
    if (user.banExpiresAt && new Date(user.banExpiresAt) > new Date()) {
      const banDate = new Date(user.banExpiresAt);
      const isPermanent = banDate.getFullYear() > 3000;
      const msg = isPermanent
        ? 'Your account has been permanently banned.'
        : `Your account is banned until ${banDate.toLocaleDateString()} ${banDate.toLocaleTimeString()}.`;

      console.log('🚫 Ban detected on navigation!');
      setBanMessage(msg);
      setIsBanned(true);
    }
  }, [pathname, user?.$id, user?.banExpiresAt]); // Re-check when pathname or ban status changes

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      // Ignore errors (e.g., guest user, missing scopes)
      console.log('Logout error ignored:', error);
    }

    // Always clear local state regardless of server response
    setIsAuthenticated(false);
    setUser(null);
    setIsBanned(false);
    setBanMessage('');

    // Force redirect to login
    router.replace('/(auth)/sign-in');
  };

  if (!fontsLoaded || isLoading) return null;

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />

      {/* 🚫 BLOCKING BAN MODAL */}
      <Modal
        visible={isBanned}
        transparent={true}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: 'white',
            width: '100%',
            padding: 32,
            borderRadius: 24,
            alignItems: 'center',
            elevation: 5,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FEE2E2',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}>
              <Text style={{ fontSize: 40 }}>🚫</Text>
            </View>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#EF4444', marginBottom: 12, textAlign: 'center' }}>
              Account Suspended
            </Text>

            <Text style={{ fontSize: 16, color: '#4B5563', textAlign: 'center', marginBottom: 32, lineHeight: 24 }}>
              {banMessage || 'Your account is currently banned from accessing the application.'}
            </Text>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: '#EF4444',
                paddingVertical: 16,
                paddingHorizontal: 32,
                borderRadius: 16,
                width: '100%',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default Sentry.wrap(RootLayoutComponent);