// app/admin/customers.tsx - NEW SCREEN

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
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
}

const AdminCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    // Filter customers by search
    const filteredCustomers = customers.filter(customer => 
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getRoleBadge = (role: string) => {
        if (role === 'admin') {
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
                                    {getRoleBadge(customer.role)}
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
                            <TouchableOpacity
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: '#F5F5F5',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Image
                                    source={images.arrowRight}
                                    style={{ width: 20, height: 20 }}
                                    resizeMode="contain"
                                    tintColor="#878787"
                                />
                            </TouchableOpacity>
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminCustomers;