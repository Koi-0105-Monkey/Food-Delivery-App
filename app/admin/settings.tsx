// app/admin/settings.tsx - FIXED LOGOUT
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { images } from '@/constants';
import useAuthStore from '@/store/auth.store';
import { account } from '@/lib/appwrite';

const AdminSettings = () => {
    const { setIsAuthenticated, setUser } = useAuthStore();

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout from admin panel?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // ✅ Delete session from Appwrite
                            await account.deleteSession('current');
                            
                            // ✅ Clear auth store
                            setIsAuthenticated(false);
                            setUser(null);
                            
                            // ✅ Redirect to sign-in
                            router.replace('/sign-in');
                        } catch (error) {
                            console.error('Logout error:', error);
                            Alert.alert('Error', 'Failed to logout');
                        }
                    },
                },
            ]
        );
    };

    const SettingItem = ({ 
        icon, 
        title, 
        subtitle, 
        onPress, 
        danger 
    }: { 
        icon: any; 
        title: string; 
        subtitle?: string; 
        onPress: () => void; 
        danger?: boolean;
    }) => (
        <TouchableOpacity
            style={{
                backgroundColor: 'white',
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
            onPress={onPress}
        >
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: danger ? '#FFE5E5' : '#FFF5E6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 16,
                }}
            >
                <Image
                    source={icon}
                    style={{ width: 24, height: 24 }}
                    tintColor={danger ? '#F14141' : '#FE8C00'}
                />
            </View>
            
            <View style={{ flex: 1 }}>
                <Text style={{ 
                    fontSize: 16, 
                    fontWeight: 'bold', 
                    color: danger ? '#F14141' : '#181C2E',
                    marginBottom: 4,
                }}>
                    {title}
                </Text>
                {subtitle && (
                    <Text style={{ fontSize: 14, color: '#878787' }}>{subtitle}</Text>
                )}
            </View>

            <Image
                source={images.arrowRight}
                style={{ width: 20, height: 20 }}
                tintColor="#878787"
            />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                        SETTINGS
                    </Text>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                        Admin Panel
                    </Text>
                </View>

                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 16,
                        padding: 20,
                        marginBottom: 24,
                        alignItems: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 2,
                    }}
                >
                    <View
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#FFF5E6',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 40 }}>👨‍💼</Text>
                    </View>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#181C2E' }}>
                        Admin User
                    </Text>
                    <Text style={{ fontSize: 14, color: '#878787', marginTop: 4 }}>
                        admin@fastfood.com
                    </Text>
                </View>

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginBottom: 12 }}>
                    Store Settings
                </Text>

                <SettingItem
                    icon={images.home}
                    title="Store Information"
                    subtitle="Name, address, contact"
                    onPress={() => Alert.alert('Coming Soon', 'Store information settings')}
                />

                <SettingItem
                    icon={images.clock}
                    title="Operating Hours"
                    subtitle="Set opening and closing times"
                    onPress={() => Alert.alert('Coming Soon', 'Operating hours settings')}
                />

                <SettingItem
                    icon={images.dollar}
                    title="Payment Methods"
                    subtitle="Manage payment options"
                    onPress={() => Alert.alert('Coming Soon', 'Payment methods settings')}
                />

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginTop: 24, marginBottom: 12 }}>
                    App Settings
                </Text>

                <SettingItem
                    icon={images.envelope}
                    title="Notifications"
                    subtitle="Email and push notifications"
                    onPress={() => Alert.alert('Coming Soon', 'Notification settings')}
                />

                <SettingItem
                    icon={images.user}
                    title="Admin Users"
                    subtitle="Manage admin accounts"
                    onPress={() => Alert.alert('Coming Soon', 'Admin users management')}
                />

                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F14141', marginTop: 24, marginBottom: 12 }}>
                    Danger Zone
                </Text>

                <SettingItem
                    icon={images.logout}
                    title="Logout"
                    subtitle="Sign out from admin panel"
                    onPress={handleLogout}
                    danger
                />

                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={{ fontSize: 14, color: '#878787' }}>FastFood Admin Panel</Text>
                    <Text style={{ fontSize: 12, color: '#878787', marginTop: 4 }}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminSettings;