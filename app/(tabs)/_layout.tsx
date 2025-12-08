import { Redirect, Tabs } from 'expo-router';
import useAuthStore from '@/store/auth.store';
import { TabBarIconProps } from '@/type';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { images } from '@/constants';

const TabBarIcon = ({ focused, icon, title }: TabBarIconProps) => (
    <View style={{ 
        alignItems: 'center', 
        justifyContent: 'center',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: focused ? '#FFF5E6' : 'transparent',
    }}>
        <Image 
            source={icon} 
            style={{ width: 28, height: 28, marginBottom: 4 }}
            resizeMode="contain" 
            tintColor={focused ? '#FE8C00' : '#878787'} 
        />
        <Text 
            style={{ 
                fontSize: 11, 
                fontWeight: '600',
                color: focused ? '#FE8C00' : '#878787',
                marginTop: 2,
            }}
        >
            {title}
        </Text>
    </View>
);

export default function TabLayout() {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
                <ActivityIndicator size="large" color="#FE8C00" />
                <Text style={{ marginTop: 10, color: '#878787' }}>Loading...</Text>
            </View>
        );
    }

    if (!isAuthenticated) {
        console.log('→ Redirecting to sign-in (no active session)');
        return <Redirect href="/sign-in" />;
    }

    console.log('✓ Showing app tabs');

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 80,
                    backgroundColor: 'white',
                    borderTopWidth: 1,
                    borderTopColor: '#F3F4F6',
                    paddingBottom: 8,
                    paddingTop: 8,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarItemStyle: {
                    height: 64,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ focused }) => (
                        <TabBarIcon title="Home" icon={images.home} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: 'Search',
                    tabBarIcon: ({ focused }) => (
                        <TabBarIcon title="Search" icon={images.search} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="cart"
                options={{
                    title: 'Cart',
                    tabBarIcon: ({ focused }) => (
                        <TabBarIcon title="Cart" icon={images.bag} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ focused }) => (
                        <TabBarIcon title="Profile" icon={images.person} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}