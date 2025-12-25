// app/admin/customers.tsx - NEW SCREEN

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, RefreshControl, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { images } from '@/constants';
import { Query } from 'react-native-appwrite';

interface Customer {
    $id: string;
    name: string;
    email: string;
    avatar: string;
    phone: string;
    role: string;
    $createdAt: string;
    banExpiresAt?: string;
}

const AdminCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Ban Modal State
    const [banModalVisible, setBanModalVisible] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [banLoading, setBanLoading] = useState(false);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        try {
            setLoading(true);

            const users = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                [
                    Query.orderDesc('$createdAt'),
                    Query.limit(100),
                ]
            );

            setCustomers(users.documents as unknown as Customer[]);
        } catch (error) {
            console.error('Failed to load customers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBanUser = async (duration: '24h' | '1week' | '1month' | '1year' | 'permanent') => {
        if (!selectedCustomer) return;

        try {
            setBanLoading(true);

            const now = new Date();
            let expiresAt = new Date();

            switch (duration) {
                case '24h':
                    expiresAt.setTime(now.getTime() + 24 * 60 * 60 * 1000);
                    break;
                case '1week':
                    expiresAt.setDate(now.getDate() + 7);
                    break;
                case '1month':
                    expiresAt.setMonth(now.getMonth() + 1);
                    break;
                case '1year':
                    expiresAt.setFullYear(now.getFullYear() + 1);
                    break;
                case 'permanent':
                    expiresAt.setFullYear(9999);
                    break;
            }

            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId,
                selectedCustomer.$id,
                {
                    banExpiresAt: expiresAt.toISOString(),
                }
            );

            Alert.alert('Success', `User ${selectedCustomer.name} has been banned.`);
            setBanModalVisible(false);
            loadCustomers(); // Refresh list

        } catch (error: any) {
            console.error('Failed to ban user:', error);
            Alert.alert('Error', 'Failed to ban user. Please try again.');
        } finally {
            setBanLoading(false);
        }
    };

    const handleUnbanUser = async (customer: Customer) => {
        try {
            Alert.alert(
                'Unban User',
                `Are you sure you want to unban ${customer.name}?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Unban',
                        onPress: async () => {
                            setLoading(true);
                            await databases.updateDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.userCollectionId,
                                customer.$id,
                                {
                                    banExpiresAt: null, // Remove ban
                                }
                            );
                            loadCustomers();
                            Alert.alert('Success', 'User unbanned successfully');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Failed to unban user:', error);
            Alert.alert('Error', 'Failed to unban user');
        }
    };

    // Filter customers by search
    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isBanned = (customer: Customer) => {
        if (!customer.banExpiresAt) return false;
        return new Date(customer.banExpiresAt) > new Date();
    };

    const getRoleBadge = (customer: Customer) => {
        if (customer.role === 'admin') {
            return (
                <View style={{
                    backgroundColor: '#FE8C00',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4
                }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
                        ADMIN
                    </Text>
                </View>
            );
        }
        if (isBanned(customer)) {
            return (
                <View style={{
                    backgroundColor: '#EF4444',
                    borderRadius: 12,
                    paddingHorizontal: 8,
                    paddingVertical: 4
                }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
                        BANNED
                    </Text>
                </View>
            );
        }
        return null;
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            {/* Header */}
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                    CUSTOMER MANAGEMENT
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                    All Customers
                </Text>

                {/* Stats */}
                <View style={{ flexDirection: 'row', marginTop: 16, gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {customers.length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Total Users</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12 }}>
                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E' }}>
                            {customers.filter(c => c.role === 'admin').length}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#878787' }}>Admins</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 16,
                    marginTop: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                }}>
                    <Image
                        source={images.search}
                        style={{ width: 20, height: 20, marginRight: 12 }}
                        resizeMode="contain"
                        tintColor="#878787"
                    />
                    <TextInput
                        style={{ flex: 1, paddingVertical: 16, fontSize: 16, color: '#181C2E' }}
                        placeholder="Search customers..."
                        placeholderTextColor="#878787"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            {/* Customer List */}
            <ScrollView
                style={{ flex: 1, marginTop: 20 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadCustomers} />
                }
            >
                {filteredCustomers.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#878787' }}>
                            {searchQuery ? 'No customers found' : 'No customers yet'}
                        </Text>
                    </View>
                ) : (
                    filteredCustomers.map((customer) => (
                        <View
                            key={customer.$id}
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
                        >
                            {/* Avatar */}
                            <Image
                                source={{ uri: customer.avatar || 'https://via.placeholder.com/80' }}
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 30,
                                    marginRight: 16,
                                    backgroundColor: '#F5F5F5',
                                }}
                                resizeMode="cover"
                            />

                            {/* Info */}
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 }}>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#181C2E' }}>
                                        {customer.name}
                                    </Text>
                                    {getRoleBadge(customer)}
                                </View>

                                <Text style={{ fontSize: 14, color: '#878787', marginBottom: 2 }}>
                                    📧 {customer.email}
                                </Text>

                                {customer.phone && (
                                    <Text style={{ fontSize: 14, color: '#878787', marginBottom: 2 }}>
                                        📱 {customer.phone}
                                    </Text>
                                )}

                                <Text style={{ fontSize: 12, color: '#878787', marginTop: 4 }}>
                                    Joined: {new Date(customer.$createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric'
                                    })}
                                </Text>
                            </View>

                            {/* Actions */}
                            {customer.role !== 'admin' && (
                                <View style={{ flexDirection: 'column', gap: 8 }}>
                                    {isBanned(customer) ? (
                                        <TouchableOpacity
                                            onPress={() => handleUnbanUser(customer)}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                backgroundColor: '#E8F5E9',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#10B981' }}>
                                                Unban
                                            </Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            onPress={() => {
                                                setSelectedCustomer(customer);
                                                setBanModalVisible(true);
                                            }}
                                            style={{
                                                paddingHorizontal: 12,
                                                paddingVertical: 6,
                                                borderRadius: 8,
                                                backgroundColor: '#FFE5E5',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <Text style={{ fontSize: 12, fontWeight: '600', color: '#EF4444' }}>
                                                Ban
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>

            {/* Ban Modal */}
            <Modal
                visible={banModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setBanModalVisible(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        width: '100%',
                        borderRadius: 20,
                        padding: 24,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.2,
                        shadowRadius: 10,
                    }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#EF4444', marginBottom: 8 }}>
                            Ban User
                        </Text>
                        <Text style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>
                            How long do you want to ban <Text style={{ fontWeight: 'bold' }}>{selectedCustomer?.name}</Text>?
                        </Text>

                        {banLoading ? (
                            <ActivityIndicator size="large" color="#EF4444" />
                        ) : (
                            <View style={{ gap: 10 }}>
                                {[
                                    { label: '24 Hours', value: '24h' },
                                    { label: '1 Week', value: '1week' },
                                    { label: '1 Month', value: '1month' },
                                    { label: '1 Year', value: '1year' },
                                    { label: 'Permanent', value: 'permanent' },
                                ].map((option) => (
                                    <TouchableOpacity
                                        key={option.value}
                                        onPress={() => handleBanUser(option.value as any)}
                                        style={{
                                            padding: 16,
                                            backgroundColor: '#F8F9FA',
                                            borderRadius: 12,
                                            alignItems: 'center',
                                            borderWidth: 1,
                                            borderColor: '#E5E7EB',
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151' }}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}

                                <TouchableOpacity
                                    onPress={() => setBanModalVisible(false)}
                                    style={{
                                        marginTop: 10,
                                        padding: 16,
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#666' }}>
                                        Cancel
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default AdminCustomers;