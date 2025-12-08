// app/(tabs)/profile.tsx - FIXED: Auto redirect admin on app start

import React, { useEffect, useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import useAuthStore from '@/store/auth.store';
import { useAddressStore } from '@/store/address.store';
import { images } from '@/constants';
import { router } from 'expo-router';
import { account } from '@/lib/appwrite';
import AddressListModal from '@/components/AddressListModal';
import AddEditAddressModal from '@/components/AddEditAddressModal';
import EditProfileModal from '@/components/EditProfileModal';
import { Address } from '@/store/address.store';
import { getUserOrders } from '@/lib/payment';

const ProfileField = ({ label, value, icon }: { label: string; value: string; icon: any }) => (
    <View className="profile-field">
        <View className="profile-field__icon">
            <Image source={icon} className="size-6" resizeMode="contain" tintColor="#FE8C00" />
        </View>
        <View className="flex-1">
            <Text className="body-medium text-gray-200">{label}</Text>
            <Text className="paragraph-semibold text-dark-100">{value}</Text>
        </View>
    </View>
);

const Profile = () => {
    const { user, setIsAuthenticated, setUser, isAdmin } = useAuthStore();
    const { defaultAddress, getDisplayAddress, fetchAddresses } = useAddressStore();
    
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showAddressListModal, setShowAddressListModal] = useState(false);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingAddress, setEditingAddress] = useState<Address | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Order History State
    const [hasPendingOrders, setHasPendingOrders] = useState(false);
    const [hasCompletedOrders, setHasCompletedOrders] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // ✅ AUTO REDIRECT ADMIN ON APP START
    useEffect(() => {
        if (user && isAdmin) {
            console.log('🔐 Admin detected, redirecting to dashboard...');
            router.replace('/admin/dashboard');
        }
    }, [user, isAdmin]);

    useEffect(() => {
        if (user) {
            fetchAddresses();
        }
    }, [user]);

    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                checkOrdersCount();
            }
        }, [user])
    );

    const checkOrdersCount = async () => {
        if (!user) return;
        
        try {
            const userOrders = await getUserOrders(user.$id);
            
            const pending = userOrders.filter(order => 
                order.payment_status === 'pending' || 
                order.payment_status === 'failed'
            );
            
            const completed = userOrders.filter(order => 
                order.payment_status === 'paid'
            );
            
            setHasPendingOrders(pending.length > 0);
            setHasCompletedOrders(completed.length > 0);
            
            if (isInitialLoad) {
                console.log(`✅ Loaded ${pending.length} pending, ${completed.length} completed orders`);
                setIsInitialLoad(false);
            }
        } catch (error) {
            console.error('Failed to check orders count:', error);
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoggingOut(true);
                        try {
                            await account.deleteSession('current');
                            setIsAuthenticated(false);
                            setUser(null);
                            router.replace('/sign-in');
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to logout');
                        } finally {
                            setIsLoggingOut(false);
                        }
                    },
                },
            ]
        );
    };

    const openGoogleMaps = () => {
        if (!defaultAddress?.fullAddress) {
            return Alert.alert('No Address', 'Please set your delivery address first.');
        }

        const encodedAddress = encodeURIComponent(defaultAddress.fullAddress);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

        Linking.openURL(mapsUrl).catch(() => {
            Alert.alert('Error', 'Unable to open Google Maps');
        });
    };

    const handleAddNewAddress = () => {
        setShowAddressListModal(false);
        setEditingAddress(null);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleEditAddress = (address: Address) => {
        setShowAddressListModal(false);
        setEditingAddress(address);
        setTimeout(() => {
            setShowAddEditModal(true);
        }, 300);
    };

    const handleCloseAddEditModal = () => {
        setShowAddEditModal(false);
        setEditingAddress(null);
        setTimeout(() => {
            fetchAddresses();
            setShowAddressListModal(true);
        }, 300);
    };

    const handleViewOrders = (type: 'pending' | 'completed') => {
        router.push(`/orders?type=${type}`);
    };

    return (
        <SafeAreaView className="bg-white h-full">
            <ScrollView contentContainerClassName="px-5 pt-5 pb-32">
                {/* Header */}
                <View className="flex-between flex-row w-full mb-10">
                    <View>
                        <Text className="small-bold text-primary">MY PROFILE</Text>
                        <Text className="h3-bold text-dark-100 mt-1">Account Details</Text>
                    </View>
                </View>

                {/* Avatar Section */}
                <View className="flex-center mb-10">
                    <View className="profile-avatar">
                        <Image
                            source={{ uri: user?.avatar || 'https://via.placeholder.com/150' }}
                            className="size-full rounded-full"
                            resizeMode="cover"
                        />
                        <TouchableOpacity 
                            className="profile-edit"
                            onPress={() => setShowEditModal(true)}
                        >
                            <Image
                                source={images.pencil}
                                className="size-3"
                                resizeMode="contain"
                                tintColor="#ffffff"
                            />
                        </TouchableOpacity>
                    </View>
                    <Text className="h3-bold text-dark-100 mt-4">{user?.name || 'Guest User'}</Text>
                    <Text className="body-regular text-gray-200">{user?.email || 'No email'}</Text>
                </View>

                {/* Profile Information */}
                <View className="mb-8">
                    <Text className="base-bold text-dark-100 mb-4">Personal Information</Text>

                    <ProfileField
                        label="Full Name"
                        value={user?.name || 'Not provided'}
                        icon={images.user}
                    />

                    <ProfileField
                        label="Email Address"
                        value={user?.email || 'Not provided'}
                        icon={images.envelope}
                    />

                    <ProfileField
                        label="Phone Number"
                        value={user?.phone || 'Not set'}
                        icon={images.phone}
                    />

                    <View className="profile-field">
                        <View className="profile-field__icon">
                            <Image source={images.location} className="size-6" resizeMode="contain" tintColor="#FE8C00" />
                        </View>
                        <View className="flex-1">
                            <Text className="body-medium text-gray-200">Default Delivery Address</Text>
                            <Text className="paragraph-semibold text-dark-100" numberOfLines={3}>
                                {defaultAddress?.fullAddress || 'Not set'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="gap-4">
                    {/* Edit Profile */}
                    <TouchableOpacity
                        className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                        onPress={() => setShowEditModal(true)}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="size-12 rounded-full bg-primary/10 flex-center">
                                <Image
                                    source={images.pencil}
                                    className="size-6"
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                            </View>
                            <Text className="paragraph-semibold text-dark-100">Edit Profile</Text>
                        </View>
                        <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                    </TouchableOpacity>

                    {/* Manage Addresses */}
                    <TouchableOpacity
                        className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                        onPress={() => setShowAddressListModal(true)}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="size-12 rounded-full bg-primary/10 flex-center">
                                <Image
                                    source={images.location}
                                    className="size-6"
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                            </View>
                            <Text className="paragraph-semibold text-dark-100">
                                Manage Addresses
                            </Text>
                        </View>
                        <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                    </TouchableOpacity>

                    {/* View on Google Maps */}
                    {defaultAddress && (
                        <TouchableOpacity
                            className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                            onPress={openGoogleMaps}
                        >
                            <View className="flex-row items-center gap-3">
                                <View className="size-12 rounded-full bg-success/10 flex-center">
                                    <Image
                                        source={images.location}
                                        className="size-6"
                                        resizeMode="contain"
                                        tintColor="#2F9B65"
                                    />
                                </View>
                                <Text className="paragraph-semibold text-dark-100">
                                    View on Google Maps
                                </Text>
                            </View>
                            <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                        </TouchableOpacity>
                    )}

                    {/* Order History Buttons */}
                    {(hasPendingOrders || hasCompletedOrders) && (
                        <View className="mt-4">
                            <Text className="base-bold text-dark-100 mb-4">📦 Order History</Text>
                            
                            {hasPendingOrders && (
                                <TouchableOpacity
                                    className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between mb-3"
                                    onPress={() => handleViewOrders('pending')}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className="size-12 rounded-full bg-primary/10 flex-center">
                                            <Text className="text-2xl">⏳</Text>
                                        </View>
                                        <Text className="paragraph-semibold text-dark-100">
                                            View Pending Orders
                                        </Text>
                                    </View>
                                    <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                                </TouchableOpacity>
                            )}

                            {hasCompletedOrders && (
                                <TouchableOpacity
                                    className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                                    onPress={() => handleViewOrders('completed')}
                                >
                                    <View className="flex-row items-center gap-3">
                                        <View className="size-12 rounded-full bg-success/10 flex-center">
                                            <Text className="text-2xl">✓</Text>
                                        </View>
                                        <Text className="paragraph-semibold text-dark-100">
                                            View Transaction History
                                        </Text>
                                    </View>
                                    <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Logout */}
                    <TouchableOpacity
                        className="bg-error/10 border border-error rounded-2xl p-5 flex-row items-center justify-between"
                        onPress={handleLogout}
                        disabled={isLoggingOut}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="size-12 rounded-full bg-error/20 flex-center">
                                <Image
                                    source={images.logout}
                                    className="size-6"
                                    resizeMode="contain"
                                    tintColor="#F14141"
                                />
                            </View>
                            <Text className="paragraph-semibold text-error">
                                {isLoggingOut ? 'Logging out...' : 'Logout'}
                            </Text>
                        </View>
                        <Image
                            source={images.arrowRight}
                            className="size-5"
                            resizeMode="contain"
                            tintColor="#F14141"
                        />
                    </TouchableOpacity>
                </View>

                {/* App Info */}
                <View className="mt-10 flex-center">
                    <Text className="body-regular text-gray-200">Food Delivery App</Text>
                    <Text className="small-bold text-gray-200 mt-1">Version 1.0.0</Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <EditProfileModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
            />

            {/* Address List Modal */}
            <AddressListModal
                visible={showAddressListModal}
                onClose={() => {
                    setShowAddressListModal(false);
                    fetchAddresses();
                }}
                onAddNew={handleAddNewAddress}
                onEdit={handleEditAddress}
            />

            {/* Add/Edit Address Modal */}
            <AddEditAddressModal
                visible={showAddEditModal}
                onClose={handleCloseAddEditModal}
                editAddress={editingAddress}
            />

        </SafeAreaView>
    );
};

export default Profile;