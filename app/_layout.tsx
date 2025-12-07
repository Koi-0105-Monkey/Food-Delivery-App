import {SplashScreen, Stack} from "expo-router";
import { useFonts } from 'expo-font';
import { useEffect } from "react";

import './globals.css';
import * as Sentry from '@sentry/react-native';
import useAuthStore from "@/store/auth.store";
import { useCartStore } from "@/store/cart.store";

// ✅ Sentry config for SDK 54
Sentry.init({
  dsn: 'https://94edd17ee98a307f2d85d750574c454a@o4506876178464768.ingest.us.sentry.io/4509588544094208',
  enableAutoPerformanceTracing: true,
  enableCaptureFailedRequests: true,
  tracesSampleRate: 1.0,
});

function RootLayoutComponent() {
  // ✅ ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY RENDER
  const { isLoading, fetchAuthenticatedUser, user } = useAuthStore();
  const { loadCartFromServer } = useCartStore();

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

  // Load cart when user is authenticated
  useEffect(() => {
    if (user) {
      loadCartFromServer();
    }
  }, [user]);

  // ❌ REMOVE useMemo - không cần thiết và gây lỗi hook order
  // ✅ Chỉ cần return JSX trực tiếp
  if(!fontsLoaded || isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

// ✅ Wrap with Sentry
export default Sentry.wrap(RootLayoutComponent);