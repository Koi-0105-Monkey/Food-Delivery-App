// app/orders.tsx - Orders List Screen

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useState, useEffect } from 'react';
import useAuthStore from '@/store/auth.store';
import { getUserOrders, cancelOrder, updatePaymentStatus } from '@/lib/payment';
import { Order } from '@/type';
import OrderInvoice from '@/components/OrderInvoice';
import CustomHeader from '@/components/CustomHeader';

const OrdersScreen = () => {
    const { type } = useLocalSearchParams<{ type: 'pending' | 'completed' }>();
    const { user } = useAuthStore();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [showInvoice, setShowInvoice] = useState(false);

    useEffect(() => {
        if (user && type) {
            loadOrders();
        }
    }, [user, type]);

    const loadOrders = async () => {
        if (!user || !type) return;
        
        try {
            setLoading(true);
            const userOrders = await getUserOrders(user.$id);
            
            // Filter orders based on type
            const filtered = userOrders.filter(order => {
                if (type === 'pending') {
                    return order.payment_status === 'pending' || order.payment_status === 'failed';
                } else {
                    return order.payment_status === 'paid';
                }
            });
            
            setOrders(filtered);
            console.log(`✅ Loaded ${filtered.length} ${type} orders`);
        } catch (error) {
            console.error('Failed to load orders:', error);
            Alert.alert('Error', 'Failed to load orders. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleViewOrder = (order: Order) => {
        setSelectedOrder(order);
        setShowInvoice(true);
    };

    const handleCancelOrder = async () => {
        if (!selectedOrder) return;
        
        try {
            await cancelOrder(selectedOrder.$id);
            await loadOrders(); // Refresh orders list
            Alert.alert('Success', 'Order has been cancelled.');
            setShowInvoice(false);
            setSelectedOrder(null);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to cancel order');
        }
    };

    const handleSwitchPaymentMethod = async (method: 'qr' | 'card' | 'cod') => {
        if (!selectedOrder) return;

        try {
            if (method === 'cod') {
                // Update to COD
                await updatePaymentStatus(selectedOrder.$id, 'paid', `COD${Date.now()}`);
                Alert.alert('Success', 'Order updated to Cash on Delivery!');
                await loadOrders();
                setShowInvoice(false);
                setSelectedOrder(null);
            } else {
                // For QR or Card, we need to update the payment method
                // This would require updating the order's payment_method field
                // For now, we'll show an alert
                Alert.alert(
                    'Switch Payment Method',
                    `To switch to ${method === 'qr' ? 'QR Code' : 'Card'} payment, please create a new order with that payment method.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setShowInvoice(false);
                                setSelectedOrder(null);
                            },
                        },
                    ]
                );
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to switch payment method');
        }
    };

    // Group orders by date
    const groupOrdersByDate = (orders: Order[]) => {
        const grouped: { [date: string]: Order[] } = {};
        
        orders.forEach(order => {
            const date = new Date(order.$createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(order);
        });
        
        return grouped;
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return '#2F9B65';
            case 'pending': return '#FE8C00';
            case 'failed': return '#F14141';
            default: return '#878787';
        }
    };

    // Get payment method label
    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cod': return '💵 Cash on Delivery';
            case 'bidv': return '🏦 BIDV Banking';
            case 'card': return '💳 Credit Card';
            default: return method;
        }
    };

    const title = type === 'pending' ? 'Pending Orders' : 'Transaction History';

    return (
        <SafeAreaView className="bg-white h-full">
            <CustomHeader 
                title={title}
                onBack={() => router.back()}
            />

            {loading ? (
                <View className="flex-center py-10">
                    <ActivityIndicator size="large" color="#FE8C00" />
                </View>
            ) : orders.length === 0 ? (
                <View className="flex-center py-20 px-5">
                    <Text className="h3-bold text-dark-100 mb-2 text-center">
                        No {type === 'pending' ? 'pending' : 'completed'} orders
                    </Text>
                    <Text className="body-regular text-gray-200 text-center">
                        {type === 'pending' 
                            ? 'You don\'t have any pending orders at the moment.'
                            : 'You haven\'t completed any orders yet.'}
                    </Text>
                </View>
            ) : (
                <ScrollView contentContainerClassName="px-5 py-5 pb-32">
                    {Object.entries(groupOrdersByDate(orders)).map(([date, dateOrders]) => (
                        <View key={date} className="mb-6">
                            {/* Date Header */}
                            <View className="flex-row items-center mb-3">
                                <Text className="paragraph-bold text-gray-200">
                                    {date}
                                </Text>
                                <View className="flex-1 h-px bg-gray-200 ml-3" />
                            </View>

                            {/* Orders for this date */}
                            {dateOrders.map((order) => (
                                <TouchableOpacity
                                    key={order.$id}
                                    className={`bg-white border-2 rounded-2xl p-4 mb-3 ${
                                        type === 'pending' ? 'border-primary' : 'border-gray-200'
                                    }`}
                                    onPress={() => handleViewOrder(order)}
                                >
                                    <View className="flex-row items-center justify-between mb-2">
                                        <Text className="paragraph-bold text-dark-100">
                                            {order.order_number}
                                        </Text>
                                        <View
                                            style={{
                                                backgroundColor: getStatusColor(order.payment_status) + '20',
                                                paddingHorizontal: 12,
                                                paddingVertical: 4,
                                                borderRadius: 12,
                                            }}
                                        >
                                            <Text
                                                className="small-bold"
                                                style={{ color: getStatusColor(order.payment_status) }}
                                            >
                                                {type === 'pending' 
                                                    ? `⏳ ${order.payment_status === 'pending' ? 'Pending' : 'Failed'}`
                                                    : '✓ Paid'}
                                            </Text>
                                        </View>
                                    </View>
                                    
                                    {/* Payment Method */}
                                    <Text className="body-regular text-gray-200 mb-2">
                                        {getPaymentMethodLabel(order.payment_method)}
                                    </Text>
                                    
                                    {type === 'completed' && (
                                        <Text className="body-regular text-gray-200 mb-2">
                                            {new Date(order.$createdAt).toLocaleTimeString('en-US', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    )}
                                    
                                    <View className="flex-row items-center justify-between">
                                        <Text className="paragraph-semibold text-primary">
                                            {order.total.toLocaleString('vi-VN')}đ
                                        </Text>
                                        <Text className={`body-medium ${
                                            type === 'pending' ? 'text-primary' : 'text-gray-200'
                                        }`}>
                                            {type === 'pending' ? 'Tap to view →' : 'View Invoice →'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            )}

            {/* Order Invoice Modal */}
            {selectedOrder && (
                <OrderInvoice
                    visible={showInvoice}
                    onClose={() => {
                        setShowInvoice(false);
                        setSelectedOrder(null);
                    }}
                    order={selectedOrder}
                    onCancel={type === 'pending' ? handleCancelOrder : undefined}
                    onRefresh={loadOrders}
                    onSwitchPaymentMethod={type === 'pending' ? handleSwitchPaymentMethod : undefined}
                />
            )}
        </SafeAreaView>
    );
};

export default OrdersScreen;

