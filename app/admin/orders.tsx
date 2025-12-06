// app/admin/orders.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'cancelled'>('all');

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            
            let queries = [Query.orderDesc('$createdAt'), Query.limit(50)];
            
            if (filter !== 'all') {
                queries.push(Query.equal('payment_status', filter));
            }

            const result = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId,
                queries
            );

            setOrders(result.documents);
        } catch (error) {
            console.error('Failed to load orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateOrderStatus = async (orderId: string, status: string) => {
        try {
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId,
                orderId,
                { order_status: status }
            );
            
            Alert.alert('Success', `Order status updated to ${status}`);
            loadOrders();
        } catch (error) {
            Alert.alert('Error', 'Failed to update order status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#2F9B65';
            case 'pending': return '#FE8C00';
            case 'failed': return '#F14141';
            case 'cancelled': return '#878787';
            default: return '#878787';
        }
    };

    const FilterButton = ({ label, value }: { label: string; value: typeof filter }) => (
        <TouchableOpacity
            style={{
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 20,
                backgroundColor: filter === value ? '#FE8C00' : 'white',
                marginRight: 8,
                borderWidth: 1,
                borderColor: filter === value ? '#FE8C00' : '#E0E0E0',
            }}
            onPress={() => setFilter(value)}
        >
            <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: filter === value ? 'white' : '#878787',
            }}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                    ORDER MANAGEMENT
                </Text>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                    All Orders
                </Text>
                
                {/* Filters */}
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={{ marginTop: 20, marginBottom: 16 }}
                >
                    <FilterButton label="All" value="all" />
                    <FilterButton label="Pending" value="pending" />
                    <FilterButton label="Paid" value="paid" />
                    <FilterButton label="Cancelled" value="cancelled" />
                </ScrollView>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={loadOrders} />
                }
            >
                {orders.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 18, color: '#878787' }}>No orders found</Text>
                    </View>
                ) : (
                    orders.map((order) => (
                        <View
                            key={order.$id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: 16,
                                padding: 16,
                                marginBottom: 12,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }}
                        >
                            {/* Order Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                <View>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#181C2E' }}>
                                        {order.order_number}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#878787', marginTop: 2 }}>
                                        {new Date(order.$createdAt).toLocaleString('vi-VN')}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        backgroundColor: getStatusColor(order.payment_status) + '20',
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 12,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 12,
                                            fontWeight: 'bold',
                                            color: getStatusColor(order.payment_status),
                                        }}
                                    >
                                        {order.payment_status.toUpperCase()}
                                    </Text>
                                </View>
                            </View>

                            {/* Order Info */}
                            <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>Total:</Text>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#FE8C00' }}>
                                        {order.total.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>Payment:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#181C2E' }}>
                                        {order.payment_method.toUpperCase()}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>Customer:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#181C2E' }}>
                                        {order.delivery_phone}
                                    </Text>
                                </View>
                            </View>

                            {/* Actions */}
                            {order.payment_status === 'pending' && (
                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#2F9B65',
                                            borderRadius: 8,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                        }}
                                        onPress={() => updateOrderStatus(order.$id, 'confirmed')}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                            ✓ Confirm
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={{
                                            flex: 1,
                                            backgroundColor: '#F14141',
                                            borderRadius: 8,
                                            paddingVertical: 10,
                                            alignItems: 'center',
                                        }}
                                        onPress={() => updateOrderStatus(order.$id, 'cancelled')}
                                    >
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                            ✕ Cancel
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export default AdminOrders;