import { View, Text, Image, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import useAuthStore from '@/store/auth.store';
import { useAddressStore } from '@/store/address.store';
import { images } from '@/constants';
import { router } from 'expo-router';
import { account } from '@/lib/appwrite';
import AddressModal from '@/components/AddressModal';
import EditProfileModal from '@/components/EditProfileModal';

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
    const { user, setIsAuthenticated, setUser } = useAuthStore();
    const { address, getDisplayAddress, fetchAddress } = useAddressStore();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Load địa chỉ khi vào profile
    useEffect(() => {
        if (user) {
            fetchAddress();
        }
    }, [user]);

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
        if (!address?.fullAddress) {
            return Alert.alert('No Address', 'Please set your delivery address first.');
        }

        const encodedAddress = encodeURIComponent(address.fullAddress);
        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

        Linking.openURL(mapsUrl).catch(() => {
            Alert.alert('Error', 'Unable to open Google Maps');
        });
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

                    <ProfileField
                        label="Delivery Address"
                        value={address?.fullAddress || 'Not set'}
                        icon={images.location}
                    />
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

                    {/* Update Address */}
                    <TouchableOpacity
                        className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                        onPress={() => setShowAddressModal(true)}
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
                                Update Address
                            </Text>
                        </View>
                        <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                    </TouchableOpacity>

                    {/* View on Google Maps */}
                    {address && (
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

                    {/* Order History */}
                    <TouchableOpacity
                        className="bg-white border border-gray-200 rounded-2xl p-5 flex-row items-center justify-between"
                        onPress={() => Alert.alert('Coming Soon', 'Order history feature coming soon!')}
                    >
                        <View className="flex-row items-center gap-3">
                            <View className="size-12 rounded-full bg-primary/10 flex-center">
                                <Image
                                    source={images.clock}
                                    className="size-6"
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                            </View>
                            <Text className="paragraph-semibold text-dark-100">Order History</Text>
                        </View>
                        <Image source={images.arrowRight} className="size-5" resizeMode="contain" />
                    </TouchableOpacity>

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

            {/* Address Modal */}
            <AddressModal
                visible={showAddressModal}
                onClose={() => {
                    setShowAddressModal(false);
                    // Refresh address sau khi đóng modal
                    fetchAddress();
                }}
            />
        </SafeAreaView>
    );
};

export default Profile;