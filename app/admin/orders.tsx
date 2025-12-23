// app/admin/orders.tsx - WITH BLOCKCHAIN REFUND SUPPORT

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';
import { blockchainService } from '@/lib/blockchain';

const AdminOrders = () => {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isRefunding, setIsRefunding] = useState(false);

    useEffect(() => {
        loadOrders();
    }, [filter]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            
            let queries = [Query.orderDesc('$createdAt'), Query.limit(50)];
            
            if (filter !== 'all') {
                queries.push(Query.equal('order_status', filter));
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

    /**
     * ✅ Confirm Order - Update to confirmed + Add to revenue
     */
    const handleConfirmOrder = async (order: any) => {
        Alert.alert(
            'Confirm Order',
            `Confirm order ${order.order_number}?\n\nAmount: ${order.total.toLocaleString('vi-VN')}đ will be added to revenue.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            await databases.updateDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.ordersCollectionId,
                                order.$id,
                                { 
                                    order_status: 'confirmed',
                                    payment_status: 'paid',
                                }
                            );
                            
                            Alert.alert(
                                'Success',
                                `Order ${order.order_number} confirmed!\n💰 ${order.total.toLocaleString('vi-VN')}đ added to revenue.`
                            );
                            loadOrders();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to confirm order');
                        }
                    },
                },
            ]
        );
    };

    /**
     * ✅ Cancel Order - Update to cancelled
     */
    const handleCancelOrder = async (order: any) => {
        Alert.alert(
            'Cancel Order',
            `Are you sure you want to cancel order ${order.order_number}?`,
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await databases.updateDocument(
                                appwriteConfig.databaseId,
                                appwriteConfig.ordersCollectionId,
                                order.$id,
                                { 
                                    order_status: 'cancelled',
                                    payment_status: 'failed',
                                }
                            );
                            
                            Alert.alert('Success', `Order ${order.order_number} cancelled`);
                            loadOrders();
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to cancel order');
                        }
                    },
                },
            ]
        );
    };

    /**
     * 🔥 NEW: Handle Blockchain Refund
     */
    const handleRefundOrder = (order: any) => {
        setSelectedOrder(order);
        setShowRefundModal(true);
    };

    /**
     * 🔥 Confirm Refund via Blockchain
     */
    const confirmRefund = async () => {
        if (!selectedOrder) return;

        setIsRefunding(true);

        try {
            console.log('💸 ========== BLOCKCHAIN REFUND START ==========');
            console.log('📦 Order:', selectedOrder.order_number);
            console.log('💰 Amount:', selectedOrder.total.toLocaleString('vi-VN'), 'VND');

            // Call blockchain refund
            const result = await blockchainService.issueRefund(selectedOrder.order_number);

            if (!result.success) {
                throw new Error(result.error || 'Refund failed');
            }

            console.log('✅ Blockchain refund successful!');
            console.log('📝 TX Hash:', result.transactionHash);
            console.log('💵 Refunded:', result.refundedAmount, 'ETH');

            // Update Appwrite order status
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId,
                selectedOrder.$id,
                {
                    order_status: 'cancelled',
                    payment_status: 'refunded',
                    refund_tx_hash: result.transactionHash,
                    refunded_at: new Date().toISOString(),
                }
            );

            console.log('✅ Appwrite updated with refund status');
            console.log('========== REFUND COMPLETE ==========\n');

            Alert.alert(
                'Refund Successful! 💸',
                `Order ${selectedOrder.order_number} has been refunded.\n\n` +
                `Amount: ${result.refundedAmount} ETH\n` +
                `TX: ${result.transactionHash?.substring(0, 20)}...`,
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            setShowRefundModal(false);
                            setSelectedOrder(null);
                            loadOrders();
                        }
                    }
                ]
            );

        } catch (error: any) {
            console.error('❌ ========== REFUND FAILED ==========');
            console.error('Error:', error.message);
            console.error('=========================================\n');
            
            Alert.alert(
                'Refund Failed',
                error.message || 'Unable to process refund. Please check:\n\n• Ganache is running\n• Contract is deployed\n• You are the contract owner'
            );
        } finally {
            setIsRefunding(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#2F9B65';
            case 'pending': return '#FE8C00';
            case 'cancelled': return '#F14141';
            default: return '#878787';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return '⏳ Pending';
            case 'confirmed': return '✓ Confirmed';
            case 'cancelled': return '✕ Cancelled';
            default: return status;
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
                    <FilterButton label="Confirmed" value="confirmed" />
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
                    orders.map((order) => {
                        // 🔥 Check if this is a blockchain payment
                        const isBlockchainPayment = order.payment_method === 'card' && 
                                                   order.payment_status === 'paid' &&
                                                   order.order_status === 'confirmed';
                        
                        return (
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
                                    borderWidth: isBlockchainPayment ? 2 : 0,
                                    borderColor: isBlockchainPayment ? '#6366F1' : 'transparent',
                                }}
                            >
                                {/* 🔗 Blockchain Badge */}
                                {isBlockchainPayment && (
                                    <View
                                        style={{
                                            position: 'absolute',
                                            top: 8,
                                            right: 8,
                                            backgroundColor: '#6366F1',
                                            borderRadius: 12,
                                            paddingHorizontal: 10,
                                            paddingVertical: 4,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4,
                                        }}
                                    >
                                        <Text style={{ fontSize: 12 }}>🔗</Text>
                                        <Text style={{ fontSize: 10, fontWeight: 'bold', color: 'white' }}>
                                            BLOCKCHAIN
                                        </Text>
                                    </View>
                                )}

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
                                            backgroundColor: getStatusColor(order.order_status) + '20',
                                            paddingHorizontal: 12,
                                            paddingVertical: 6,
                                            borderRadius: 12,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                fontSize: 12,
                                                fontWeight: 'bold',
                                                color: getStatusColor(order.order_status),
                                            }}
                                        >
                                            {getStatusLabel(order.order_status)}
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
                                            {isBlockchainPayment && ' 🔗'}
                                        </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{ fontSize: 14, color: '#878787' }}>Customer:</Text>
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#181C2E' }}>
                                            {order.delivery_phone}
                                        </Text>
                                    </View>

                                    {/* 🔗 Show TX Hash if blockchain */}
                                    {isBlockchainPayment && order.transaction_id && (
                                        <View style={{ 
                                            marginTop: 8, 
                                            backgroundColor: '#F0F0FF', 
                                            padding: 8, 
                                            borderRadius: 8 
                                        }}>
                                            <Text style={{ fontSize: 12, color: '#6366F1', fontWeight: '600' }}>
                                                TX: {order.transaction_id.substring(0, 20)}...
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* ✅ Actions - Only show for pending orders */}
                                {order.order_status === 'pending' && (
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                                        <TouchableOpacity
                                            style={{
                                                flex: 1,
                                                backgroundColor: '#2F9B65',
                                                borderRadius: 8,
                                                paddingVertical: 10,
                                                alignItems: 'center',
                                            }}
                                            onPress={() => handleConfirmOrder(order)}
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
                                            onPress={() => handleCancelOrder(order)}
                                        >
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                                ✕ Cancel
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                {/* 🔥 NEW: Refund Button for Blockchain Payments */}
                                {isBlockchainPayment && (
                                    <TouchableOpacity
                                        style={{
                                            backgroundColor: '#6366F1',
                                            borderRadius: 8,
                                            paddingVertical: 12,
                                            alignItems: 'center',
                                            marginTop: 12,
                                            flexDirection: 'row',
                                            justifyContent: 'center',
                                            gap: 8,
                                        }}
                                        onPress={() => handleRefundOrder(order)}
                                    >
                                        <Text style={{ fontSize: 16 }}>💸</Text>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                            Issue Blockchain Refund
                                        </Text>
                                    </TouchableOpacity>
                                )}

                                {/* ✅ Show revenue status for confirmed orders */}
                                {order.order_status === 'confirmed' && !isBlockchainPayment && (
                                    <View style={{ 
                                        marginTop: 12, 
                                        backgroundColor: '#E8F5E9', 
                                        padding: 10, 
                                        borderRadius: 8 
                                    }}>
                                        <Text style={{ fontSize: 12, color: '#2F9B65', textAlign: 'center' }}>
                                            💰 Counted in revenue
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* 🔥 Refund Confirmation Modal */}
            <Modal
                visible={showRefundModal}
                transparent
                animationType="fade"
                onRequestClose={() => !isRefunding && setShowRefundModal(false)}
            >
                <View style={{
                    flex: 1,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: 20,
                }}>
                    <View style={{
                        backgroundColor: 'white',
                        borderRadius: 24,
                        padding: 24,
                        width: '100%',
                        maxWidth: 400,
                    }}>
                        {/* Icon */}
                        <View style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: '#F0F0FF',
                            justifyContent: 'center',
                            alignItems: 'center',
                            alignSelf: 'center',
                            marginBottom: 20,
                        }}>
                            <Text style={{ fontSize: 40 }}>💸</Text>
                        </View>

                        {/* Title */}
                        <Text style={{
                            fontSize: 24,
                            fontWeight: 'bold',
                            color: '#181C2E',
                            textAlign: 'center',
                            marginBottom: 12,
                        }}>
                            Blockchain Refund
                        </Text>

                        {/* Description */}
                        <Text style={{
                            fontSize: 14,
                            color: '#878787',
                            textAlign: 'center',
                            marginBottom: 24,
                            lineHeight: 20,
                        }}>
                            This will refund ETH from the smart contract back to the customer's wallet on the blockchain.
                        </Text>

                        {/* Order Info */}
                        {selectedOrder && (
                            <View style={{
                                backgroundColor: '#F9FAFB',
                                borderRadius: 12,
                                padding: 16,
                                marginBottom: 24,
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>Order:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                        {selectedOrder.order_number}
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>Amount:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                        {selectedOrder.total.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={{ fontSize: 14, color: '#878787' }}>ETH Amount:</Text>
                                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#6366F1' }}>
                                        ≈ {(selectedOrder.total / 25000).toFixed(4)} ETH
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Warning */}
                        <View style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 12,
                            padding: 12,
                            marginBottom: 24,
                            flexDirection: 'row',
                            gap: 10,
                        }}>
                            <Text style={{ fontSize: 20 }}>⚠️</Text>
                            <Text style={{ fontSize: 12, color: '#FE8C00', flex: 1 }}>
                                This action cannot be undone. The ETH will be returned to the customer's wallet immediately.
                            </Text>
                        </View>

                        {/* Buttons */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#F5F5F5',
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                }}
                                onPress={() => setShowRefundModal(false)}
                                disabled={isRefunding}
                            >
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#878787' }}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6366F1',
                                    borderRadius: 12,
                                    paddingVertical: 14,
                                    alignItems: 'center',
                                }}
                                onPress={confirmRefund}
                                disabled={isRefunding}
                            >
                                <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                    {isRefunding ? 'Processing...' : 'Confirm Refund'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

export default AdminOrders;