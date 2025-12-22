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

import {SplashScreen, Stack, useRouter, useSegments} from "expo-router";
import { useFonts } from 'expo-font';
import { useEffect } from "react";

import './globals.css';
import * as Sentry from '@sentry/react-native';
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',
  enableAutoPerformanceTracing: true,
  enableCaptureFailedRequests: true,
  tracesSampleRate: 1.0,
});

function RootLayoutComponent() {
  const { isLoading, fetchAuthenticatedUser, user, isAdmin } = useAuthStore();
  const { loadCartFromServer } = useCartStore();
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, error] = useFonts({
    "QuickSand-Bold": require('../assets/fonts/Quicksand-Bold.ttf'),
    "QuickSand-Medium": require('../assets/fonts/Quicksand-Medium.ttf'),
    "QuickSand-Regular": require('../assets/fonts/Quicksand-Regular.ttf'),
    "QuickSand-SemiBold": require('../assets/fonts/Quicksand-SemiBold.ttf'),
    "QuickSand-Light": require('../assets/fonts/Quicksand-Light.ttf'),
  });

  useEffect(() => {
    if(error) throw error;
    if(fontsLoaded) SplashScreen.hideAsync();
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

  if(!fontsLoaded || isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default Sentry.wrap(RootLayoutComponent);