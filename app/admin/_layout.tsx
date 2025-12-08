// app/admin/_layout.tsx - FIXED: Settings tab cuối cùng

import { Tabs, Redirect } from 'expo-router';
import { Image, Text, View, ActivityIndicator } from 'react-native';
import { images } from '@/constants';
import cn from 'clsx';
import useAuthStore from '@/store/auth.store';

const AdminTabIcon = ({ focused, icon, title }: { focused: boolean; icon: any; title: string }) => (
    <View className="items-center justify-center" style={{ marginTop: 12 }}>
        <Image 
            source={icon} 
            className="size-7" 
            resizeMode="contain" 
            tintColor={focused ? '#FE8C00' : '#878787'} 
        />
        <Text className={cn('text-xs font-bold mt-1', focused ? 'text-primary' : 'text-gray-200')}>
            {title}
        </Text>
    </View>
);

export default function AdminLayout() {
    const { isAuthenticated, isAdmin, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text style={{ marginTop: 10, color: '#878787' }}>Checking permissions...</Text>
            </View>
        );
    }

    if (!isAuthenticated || !isAdmin) {
        console.log('🚫 Access denied: Not an admin');
        return <Redirect href="/sign-in" />;
    }

    console.log('✅ Admin access granted');

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    borderTopLeftRadius: 50,
                    borderTopRightRadius: 50,
                    marginHorizontal: 20,
                    height: 80,
                    position: 'absolute',
                    bottom: 40,
                    backgroundColor: 'white',
                    shadowColor: '#1a1a1a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 5,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon title="Dasht" icon={images.home} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Orders',
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon title="Order" icon={images.bag} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    title: 'Menu',
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon title="Menu" icon={images.search} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    title: 'Analytics',
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon title="Analy" icon={images.dollar} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon title="Settin" icon={images.person} focused={focused} />
                    ),
                }}
            />
            
            {/* Hidden tab - accessible via navigation only */}
            <Tabs.Screen
                name="customers"
                options={{
                    href: null, // Hide from tab bar
                }}
            />
        </Tabs>
    );
}