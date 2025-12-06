// components/OrderInvoice.tsx - Hoá đơn đơn hàng

import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { images } from '@/constants';
import { Order, OrderItem, CardPaymentData } from '@/type';
import { createQRPayment, updatePaymentStatus } from '@/lib/payment';

interface OrderInvoiceProps {
    visible: boolean;
    onClose: () => void;
    order: Order;
    onCancel?: () => void;
    onRefresh?: () => void;
    onSwitchPaymentMethod?: (method: 'qr' | 'card' | 'cod') => void;
}

const OrderInvoice = ({ visible, onClose, order, onCancel, onRefresh, onSwitchPaymentMethod }: OrderInvoiceProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    // QR Payment state
    const [qrPaymentData, setQrPaymentData] = useState<any>(null);
    const [isLoadingQR, setIsLoadingQR] = useState(false);
    
    // Card Payment state
    const [cardForm, setCardForm] = useState<CardPaymentData>({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
    });
    const [isProcessingCard, setIsProcessingCard] = useState(false);

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
            
            // Load QR code if order is pending and payment method is bidv
            if (order.payment_status === 'pending' && order.payment_method === 'bidv') {
                loadQRPayment();
            }
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
            setQrPaymentData(null);
            setCardForm({
                cardNumber: '',
                cardHolder: '',
                expiryDate: '',
                cvv: '',
            });
        }
    }, [visible, order]);

    const loadQRPayment = async () => {
        try {
            setIsLoadingQR(true);
            const result = await createQRPayment(order.order_number, order.total);
            if (result.success && result.bidv) {
                setQrPaymentData(result.bidv);
            }
        } catch (error) {
            console.error('Failed to load QR payment:', error);
        } finally {
            setIsLoadingQR(false);
        }
    };

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s/g, '');
        const groups = cleaned.match(/.{1,4}/g) || [];
        return groups.join(' ').substring(0, 19);
    };

    const formatExpiryDate = (text: string) => {
        const cleaned = text.replace(/\//g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
        }
        return cleaned;
    };

    const handleCardPayment = async () => {
        const cardNumber = cardForm.cardNumber.replace(/\s/g, '');
        
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            return Alert.alert('Error', 'Invalid card number');
        }
        if (!cardForm.cardHolder.trim()) {
            return Alert.alert('Error', 'Please enter card holder name');
        }
        if (!cardForm.expiryDate.match(/^\d{2}\/\d{2}$/)) {
            return Alert.alert('Error', 'Invalid expiry date (MM/YY)');
        }
        if (cardForm.cvv.length < 3) {
            return Alert.alert('Error', 'Invalid CVV');
        }

        setIsProcessingCard(true);
        try {
            const transactionId = `CARD${Date.now()}`;
            await updatePaymentStatus(order.$id, 'paid', transactionId);
            Alert.alert('Success', 'Payment successful!');
            if (onRefresh) onRefresh();
            handleClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unable to process payment');
        } finally {
            setIsProcessingCard(false);
        }
    };

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

                    {/* Payment Section - For Pending Orders from QR or Card */}
                    {(order.payment_status === 'pending' || order.payment_status === 'failed') && 
                     (order.payment_method === 'bidv' || order.payment_method === 'card') && (
                        <View style={{ marginTop: 20 }}>
                            <Text className="base-bold text-dark-100 mb-4">
                                💳 Payment Information
                            </Text>

                            {/* QR Payment Display */}
                            {order.payment_method === 'bidv' && (
                                <View>
                                    {isLoadingQR ? (
                                        <View style={{ alignItems: 'center', padding: 20 }}>
                                            <ActivityIndicator size="large" color="#005BAA" />
                                            <Text className="body-regular text-gray-200 mt-4">
                                                Loading QR code...
                                            </Text>
                                        </View>
                                    ) : qrPaymentData ? (
                                        <View
                                            style={{
                                                backgroundColor: '#F9FAFB',
                                                borderRadius: 15,
                                                padding: 15,
                                                marginBottom: 15,
                                            }}
                                        >
                                            <Text className="paragraph-bold text-dark-100 mb-3">
                                                📋 Transfer Information:
                                            </Text>
                                            <View style={{ gap: 8 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text className="body-medium text-gray-200">Bank:</Text>
                                                    <Text className="body-medium text-dark-100">BIDV</Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text className="body-medium text-gray-200">Receiver:</Text>
                                                    <Text className="body-medium text-dark-100">
                                                        {qrPaymentData.displayInfo.receiver}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text className="body-medium text-gray-200">Account No.:</Text>
                                                    <Text className="body-medium text-dark-100">
                                                        {qrPaymentData.displayInfo.accountNo}
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text className="body-medium text-gray-200">Amount:</Text>
                                                    <Text className="body-medium text-primary">
                                                        {qrPaymentData.displayInfo.amount.toLocaleString('vi-VN')}đ
                                                    </Text>
                                                </View>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                    <Text className="body-medium text-gray-200">Transfer Note:</Text>
                                                    <Text className="body-medium text-dark-100">
                                                        {qrPaymentData.displayInfo.note}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    ) : null}

                                    {qrPaymentData && (
                                        <View
                                            style={{
                                                backgroundColor: 'white',
                                                borderRadius: 20,
                                                padding: 20,
                                                alignItems: 'center',
                                                borderWidth: 2,
                                                borderColor: '#005BAA',
                                                marginBottom: 15,
                                            }}
                                        >
                                            <Text className="base-bold text-dark-100 mb-4">
                                                🏦 Scan using BIDV Smart Banking
                                            </Text>
                                            <Image
                                                source={{ uri: qrPaymentData.qrCodeUrl }}
                                                style={{ width: 280, height: 280 }}
                                                resizeMode="contain"
                                            />
                                        </View>
                                    )}

                                    {/* Alternative Payment Options */}
                                    <View style={{ marginTop: 15 }}>
                                        <Text className="base-bold text-dark-100 mb-3 text-center">
                                            Or pay with other methods:
                                        </Text>
                                        <View style={{ flexDirection: 'row', gap: 10 }}>
                                            {onSwitchPaymentMethod && (
                                                <>
                                                    <TouchableOpacity
                                                        onPress={() => onSwitchPaymentMethod('card')}
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: '#FE8C00',
                                                            borderRadius: 15,
                                                            padding: 15,
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text className="base-bold text-white">
                                                            💳 Pay by Card
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        onPress={() => onSwitchPaymentMethod('cod')}
                                                        style={{
                                                            flex: 1,
                                                            backgroundColor: '#2F9B65',
                                                            borderRadius: 15,
                                                            padding: 15,
                                                            alignItems: 'center',
                                                        }}
                                                    >
                                                        <Text className="base-bold text-white">
                                                            💵 Pay on Delivery
                                                        </Text>
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Card Payment Form */}
                            {order.payment_method === 'card' && (
                                <View>
                                    <View style={{ gap: 15, marginBottom: 15 }}>
                                        <View>
                                            <Text className="label">Card Number *</Text>
                                            <TextInput
                                                className="input border-gray-300"
                                                placeholder="1234 5678 9012 3456"
                                                value={cardForm.cardNumber}
                                                onChangeText={(text) => 
                                                    setCardForm(prev => ({ ...prev, cardNumber: formatCardNumber(text) }))
                                                }
                                                keyboardType="numeric"
                                                maxLength={19}
                                                placeholderTextColor="#888"
                                            />
                                        </View>

                                        <View>
                                            <Text className="label">Card Holder Name *</Text>
                                            <TextInput
                                                className="input border-gray-300"
                                                placeholder="JOHN DOE"
                                                value={cardForm.cardHolder}
                                                onChangeText={(text) => 
                                                    setCardForm(prev => ({ ...prev, cardHolder: text.toUpperCase() }))
                                                }
                                                autoCapitalize="characters"
                                                placeholderTextColor="#888"
                                            />
                                        </View>

                                        <View style={{ flexDirection: 'row', gap: 15 }}>
                                            <View style={{ flex: 1 }}>
                                                <Text className="label">Expiry Date *</Text>
                                                <TextInput
                                                    className="input border-gray-300"
                                                    placeholder="MM/YY"
                                                    value={cardForm.expiryDate}
                                                    onChangeText={(text) => 
                                                        setCardForm(prev => ({ ...prev, expiryDate: formatExpiryDate(text) }))
                                                    }
                                                    keyboardType="numeric"
                                                    maxLength={5}
                                                    placeholderTextColor="#888"
                                                />
                                            </View>

                                            <View style={{ flex: 1 }}>
                                                <Text className="label">CVV *</Text>
                                                <TextInput
                                                    className="input border-gray-300"
                                                    placeholder="123"
                                                    value={cardForm.cvv}
                                                    onChangeText={(text) => 
                                                        setCardForm(prev => ({ ...prev, cvv: text }))
                                                    }
                                                    keyboardType="numeric"
                                                    maxLength={4}
                                                    secureTextEntry
                                                    placeholderTextColor="#888"
                                                />
                                            </View>
                                        </View>
                                    </View>

                                    <TouchableOpacity
                                        onPress={handleCardPayment}
                                        disabled={isProcessingCard}
                                        style={{
                                            backgroundColor: '#FE8C00',
                                            borderRadius: 25,
                                            paddingVertical: 16,
                                            alignItems: 'center',
                                            marginBottom: 15,
                                        }}
                                    >
                                        {isProcessingCard ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className="base-bold text-white">
                                                Confirm Payment
                                            </Text>
                                        )}
                                    </TouchableOpacity>

                                    {/* Alternative Payment Options */}
                                    {onSwitchPaymentMethod && (
                                        <View>
                                            <Text className="base-bold text-dark-100 mb-3 text-center">
                                                Or pay with other methods:
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                                <TouchableOpacity
                                                    onPress={() => onSwitchPaymentMethod('qr')}
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: '#005BAA',
                                                        borderRadius: 15,
                                                        padding: 15,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Text className="base-bold text-white">
                                                        🏦 Pay by QR
                                                    </Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => onSwitchPaymentMethod('cod')}
                                                    style={{
                                                        flex: 1,
                                                        backgroundColor: '#2F9B65',
                                                        borderRadius: 15,
                                                        padding: 15,
                                                        alignItems: 'center',
                                                    }}
                                                >
                                                    <Text className="base-bold text-white">
                                                        💵 Pay on Delivery
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

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

                    {/* Cancel Order Button - Only for pending orders from QR or Card */}
                    {onCancel && (order.payment_status === 'pending' || order.payment_status === 'failed') && 
                     (order.payment_method === 'bidv' || order.payment_method === 'card') && (
                        <TouchableOpacity
                            onPress={() => {
                                Alert.alert(
                                    'Cancel Order?',
                                    'Are you sure you want to cancel this order? This action cannot be undone.',
                                    [
                                        {
                                            text: 'No',
                                            style: 'cancel',
                                        },
                                        {
                                            text: 'Yes, Cancel',
                                            style: 'destructive',
                                            onPress: () => {
                                                onCancel();
                                                if (onRefresh) {
                                                    onRefresh();
                                                }
                                                handleClose();
                                            },
                                        },
                                    ]
                                );
                            }}
                            style={{
                                backgroundColor: '#F14141',
                                borderRadius: 15,
                                padding: 16,
                                alignItems: 'center',
                                marginTop: 20,
                            }}
                        >
                            <Text className="base-bold text-white">
                                ❌ Cancel Order
                            </Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default OrderInvoice;