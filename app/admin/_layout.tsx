// app/admin/_layout.tsx - FINAL: Icon only, uniform size, with Customers tab

import { Tabs, Redirect } from 'expo-router';
import { Image, View, ActivityIndicator, Text } from 'react-native';
import { images } from '@/constants';
import useAuthStore from '@/store/auth.store';

const AdminTabIcon = ({ focused, icon }: { focused: boolean; icon: any }) => (
    <View style={{
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: focused ? '#FFF5E6' : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        top: 10,
    }}>
        <Image
            source={icon}
            style={{ width: 28, height: 28 }}
            resizeMode="contain"
            tintColor={focused ? '#FE8C00' : '#878787'}
        />
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

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: {
                    borderTopLeftRadius: 40,
                    borderTopRightRadius: 40,
                    marginHorizontal: 0,
                    height: 80,
                    position: 'absolute',
                    bottom: 0,
                    backgroundColor: 'white',
                },
                tabBarLabelStyle: {
                    fontWeight: "600",
                    fontSize:8,
                    top: 15,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.home} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.bag} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="menu"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.search} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="customers"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.user} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analytics"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.chart} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ focused }) => (
                        <AdminTabIcon icon={images.person} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}