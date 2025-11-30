// components/CardPaymentModal.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';

export interface CardPaymentData {
    cardNumber: string;
    cardHolder: string;
    expiryDate: string;
    cvv: string;
}

interface CardPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirmPayment: (cardData: CardPaymentData) => Promise<void>; // ✅ Chỉ async
    totalAmount: number;
    orderNumber: string;
}

const CardPaymentModal = ({ 
    visible, 
    onClose, 
    onConfirmPayment,
    totalAmount,
    orderNumber 
}: CardPaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    const [form, setForm] = useState<CardPaymentData>({
        cardNumber: '',
        cardHolder: '',
        expiryDate: '',
        cvv: '',
    });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset form
            setForm({
                cardNumber: '',
                cardHolder: '',
                expiryDate: '',
                cvv: '',
            });

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

    const formatCardNumber = (text: string) => {
        const cleaned = text.replace(/\s/g, '');
        const groups = cleaned.match(/.{1,4}/g) || [];
        return groups.join(' ').substring(0, 19); // Max 16 digits + 3 spaces
    };

    const formatExpiryDate = (text: string) => {
        const cleaned = text.replace(/\//g, '');
        if (cleaned.length >= 2) {
            return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
        }
        return cleaned;
    };

    const handleConfirm = async () => {
        // Validation
        const cardNumber = form.cardNumber.replace(/\s/g, '');
        
        if (cardNumber.length < 13 || cardNumber.length > 19) {
            return Alert.alert('Lỗi', 'Số thẻ không hợp lệ');
        }

        if (!form.cardHolder.trim()) {
            return Alert.alert('Lỗi', 'Vui lòng nhập tên chủ thẻ');
        }

        if (!form.expiryDate.match(/^\d{2}\/\d{2}$/)) {
            return Alert.alert('Lỗi', 'Ngày hết hạn không hợp lệ (MM/YY)');
        }

        if (form.cvv.length < 3) {
            return Alert.alert('Lỗi', 'CVV không hợp lệ');
        }

        setIsProcessing(true);

        // Simulate payment processing
        setTimeout(() => {
            setIsProcessing(false);
            onConfirmPayment(form);
        }, 2000);
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
            <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose}>
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </TouchableOpacity>

            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Dimensions.get('window').height * 0.85,
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
                <ScrollView 
                    contentContainerStyle={{ padding: 30 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Header */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 20,
                        }}
                    >
                        <View>
                            <Text className="h3-bold text-dark-100">Thanh toán thẻ</Text>
                            <Text className="body-regular text-gray-200 mt-1">
                                Đơn hàng: {orderNumber}
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

                    {/* Amount */}
                    <View
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 20,
                            padding: 20,
                            marginBottom: 30,
                            alignItems: 'center',
                        }}
                    >
                        <Text className="body-medium text-gray-200 mb-2">Số tiền thanh toán</Text>
                        <Text className="h1-bold text-primary" style={{ fontSize: 36 }}>
                            {totalAmount.toLocaleString('vi-VN')}đ
                        </Text>
                    </View>

                    {/* Card Form */}
                    <View style={{ gap: 20 }}>
                        {/* Card Number */}
                        <View>
                            <Text className="label">Số thẻ *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="1234 5678 9012 3456"
                                value={form.cardNumber}
                                onChangeText={(text) => 
                                    setForm(prev => ({ ...prev, cardNumber: formatCardNumber(text) }))
                                }
                                keyboardType="numeric"
                                maxLength={19}
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Card Holder */}
                        <View>
                            <Text className="label">Tên chủ thẻ *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="NGUYEN VAN A"
                                value={form.cardHolder}
                                onChangeText={(text) => 
                                    setForm(prev => ({ ...prev, cardHolder: text.toUpperCase() }))
                                }
                                autoCapitalize="characters"
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Expiry & CVV */}
                        <View style={{ flexDirection: 'row', gap: 15 }}>
                            <View style={{ flex: 1 }}>
                                <Text className="label">Ngày hết hạn *</Text>
                                <TextInput
                                    className="input border-gray-300"
                                    placeholder="MM/YY"
                                    value={form.expiryDate}
                                    onChangeText={(text) => 
                                        setForm(prev => ({ ...prev, expiryDate: formatExpiryDate(text) }))
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
                                    value={form.cvv}
                                    onChangeText={(text) => 
                                        setForm(prev => ({ ...prev, cvv: text }))
                                    }
                                    keyboardType="numeric"
                                    maxLength={4}
                                    secureTextEntry
                                    placeholderTextColor="#888"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Security Notice */}
                    <View
                        style={{
                            backgroundColor: '#E8F5E9',
                            borderRadius: 15,
                            padding: 15,
                            marginTop: 20,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                        }}
                    >
                        <Image
                            source={images.check}
                            style={{ width: 20, height: 20 }}
                            resizeMode="contain"
                            tintColor="#2F9B65"
                        />
                        <Text className="body-regular text-gray-200" style={{ flex: 1 }}>
                            Thông tin thẻ được mã hóa và bảo mật
                        </Text>
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={isProcessing}
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 30,
                        }}
                    >
                        {isProcessing ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="base-bold text-white">
                                Xác nhận thanh toán
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        onPress={handleClose}
                        style={{
                            backgroundColor: 'transparent',
                            borderWidth: 1,
                            borderColor: '#E0E0E0',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 12,
                        }}
                    >
                        <Text className="base-bold text-gray-200">Hủy</Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default CardPaymentModal;