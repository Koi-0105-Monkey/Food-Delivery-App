// components/OrderInvoice.tsx - Hoá đơn đơn hàng

import React, { useRef } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    ScrollView,
} from 'react-native';
import { images } from '@/constants';
import { Order, OrderItem } from '@/type';

interface OrderInvoiceProps {
    visible: boolean;
    onClose: () => void;
    order: Order;
}

const OrderInvoice = ({ visible, onClose, order }: OrderInvoiceProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 50,
                    friction: 8,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    if (!visible || !order) return null;

    // Parse items từ JSON string
    const orderItems: OrderItem[] = JSON.parse(order.items || '[]');

    // Format date
    const orderDate = new Date(order.$createdAt);
    const formattedDate = orderDate.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    // Get payment status label
    const getPaymentStatusLabel = (status: string) => {
        switch (status) {
            case 'paid': return { label: 'Đã thanh toán', color: '#2F9B65' };
            case 'pending': return { label: 'Chờ thanh toán', color: '#FE8C00' };
            case 'failed': return { label: 'Thanh toán thất bại', color: '#F14141' };
            default: return { label: status, color: '#878787' };
        }
    };

    // Get order status label
    const getOrderStatusLabel = (status: string) => {
        switch (status) {
            case 'confirmed': return { label: 'Đã xác nhận', color: '#2F9B65' };
            case 'preparing': return { label: 'Đang chuẩn bị', color: '#FE8C00' };
            case 'delivering': return { label: 'Đang giao', color: '#0EA5E9' };
            case 'completed': return { label: 'Hoàn thành', color: '#2F9B65' };
            case 'cancelled': return { label: 'Đã hủy', color: '#F14141' };
            default: return { label: 'Chờ xử lý', color: '#878787' };
        }
    };

    // Get payment method label
    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'cod': return '💵 Tiền mặt';
            case 'bidv': return '🏦 BIDV';
            case 'agribank': return '🏦 Agribank';
            case 'card': return '💳 Thẻ ngân hàng';
            default: return method;
        }
    };

    const paymentStatus = getPaymentStatusLabel(order.payment_status);
    const orderStatus = getOrderStatusLabel(order.order_status);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <View style={{ flex: 1 }}>
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </View>

            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Dimensions.get('window').height * 0.9,
                    backgroundColor: 'white',
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 20,
                    transform: [{ translateY: slideAnim }],
                }}
            >
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 20,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                    }}
                >
                    <View>
                        <Text className="h3-bold text-dark-100">Hoá Đơn</Text>
                        <Text className="body-regular text-gray-200 mt-1">
                            {order.order_number}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleClose}>
                        <Image
                            source={images.arrowBack}
                            style={{ width: 24, height: 24, transform: [{ rotate: '90deg' }] }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                    {/* Status Badges */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: paymentStatus.color + '20',
                                borderRadius: 12,
                                padding: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="body-medium text-gray-200">Thanh toán</Text>
                            <Text
                                className="paragraph-bold"
                                style={{ color: paymentStatus.color, marginTop: 4 }}
                            >
                                {paymentStatus.label}
                            </Text>
                        </View>

                        <View
                            style={{
                                flex: 1,
                                backgroundColor: orderStatus.color + '20',
                                borderRadius: 12,
                                padding: 12,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="body-medium text-gray-200">Đơn hàng</Text>
                            <Text
                                className="paragraph-bold"
                                style={{ color: orderStatus.color, marginTop: 4 }}
                            >
                                {orderStatus.label}
                            </Text>
                        </View>
                    </View>

                    {/* Order Info */}
                    <View
                        style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="base-bold text-dark-100 mb-3">Thông tin đơn hàng</Text>
                        
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-medium text-gray-200">Mã đơn:</Text>
                                <Text className="body-medium text-dark-100">{order.order_number}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-medium text-gray-200">Ngày đặt:</Text>
                                <Text className="body-medium text-dark-100">{formattedDate}</Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-medium text-gray-200">Hình thức:</Text>
                                <Text className="body-medium text-dark-100">
                                    {getPaymentMethodLabel(order.payment_method)}
                                </Text>
                            </View>

                            {order.transaction_id && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Mã GD:</Text>
                                    <Text className="body-medium text-dark-100" numberOfLines={1}>
                                        {order.transaction_id}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Delivery Info */}
                    <View
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="base-bold text-dark-100 mb-3">Thông tin giao hàng</Text>
                        
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                <Image
                                    source={images.location}
                                    style={{ width: 16, height: 16, marginTop: 2 }}
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                                <Text className="body-medium text-dark-100" style={{ flex: 1 }}>
                                    {order.delivery_address}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Image
                                    source={images.phone}
                                    style={{ width: 16, height: 16 }}
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                                <Text className="body-medium text-dark-100">
                                    {order.delivery_phone}
                                </Text>
                            </View>

                            {order.delivery_notes && (
                                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                                    <Text style={{ fontSize: 16 }}>📝</Text>
                                    <Text className="body-medium text-gray-200" style={{ flex: 1 }}>
                                        {order.delivery_notes}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Order Items */}
                    <Text className="base-bold text-dark-100 mb-3">Chi tiết đơn hàng</Text>
                    
                    {orderItems.map((item, index) => (
                        <View
                            key={index}
                            style={{
                                flexDirection: 'row',
                                backgroundColor: 'white',
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 10,
                                borderWidth: 1,
                                borderColor: '#F3F4F6',
                            }}
                        >
                            <Image
                                source={{ uri: item.image_url }}
                                style={{ width: 60, height: 60, borderRadius: 8 }}
                                resizeMode="cover"
                            />
                            
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text className="paragraph-bold text-dark-100" numberOfLines={1}>
                                    {item.name}
                                </Text>
                                
                                <Text className="body-regular text-gray-200 mt-1">
                                    x{item.quantity}
                                </Text>

                                {item.customizations && item.customizations.length > 0 && (
                                    <Text className="body-regular text-gray-200" numberOfLines={1}>
                                        + {item.customizations.map(c => c.name).join(', ')}
                                    </Text>
                                )}
                            </View>

                            <Text className="paragraph-bold text-primary">
                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                            </Text>
                        </View>
                    ))}

                    {/* Payment Summary */}
                    <View
                        style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 15,
                            padding: 15,
                            marginTop: 10,
                        }}
                    >
                        <View style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-medium text-gray-200">Tạm tính:</Text>
                                <Text className="body-medium text-dark-100">
                                    {order.subtotal.toLocaleString('vi-VN')}đ
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="body-medium text-gray-200">Phí giao hàng:</Text>
                                <Text className="body-medium text-dark-100">
                                    {order.delivery_fee.toLocaleString('vi-VN')}đ
                                </Text>
                            </View>

                            {order.discount > 0 && (
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text className="body-medium text-gray-200">Giảm giá:</Text>
                                    <Text className="body-medium text-success">
                                        -{order.discount.toLocaleString('vi-VN')}đ
                                    </Text>
                                </View>
                            )}

                            <View
                                style={{
                                    height: 1,
                                    backgroundColor: '#E0E0E0',
                                    marginVertical: 8,
                                }}
                            />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text className="base-bold text-dark-100">Tổng cộng:</Text>
                                <Text className="base-bold text-primary">
                                    {order.total.toLocaleString('vi-VN')}đ
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Footer Note */}
                    <View
                        style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 12,
                            padding: 15,
                            marginTop: 20,
                            alignItems: 'center',
                        }}
                    >
                        <Text className="body-regular text-gray-200" style={{ textAlign: 'center' }}>
                            Cảm ơn bạn đã đặt hàng! 🎉{'\n'}
                            Liên hệ hỗ trợ: support@fastfood.com
                        </Text>
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default OrderInvoice;