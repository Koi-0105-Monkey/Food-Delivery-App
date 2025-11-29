// components/PaymentMethodModal.tsx

import React, { useEffect, useRef, useState } from 'react';
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
import { PaymentMethod } from '@/type';

interface PaymentMethodModalProps {
    visible: boolean;
    onClose: () => void;
    onSelectMethod: (method: PaymentMethod) => void;
    totalAmount: number;
}

const PaymentMethodModal = ({ 
    visible, 
    onClose, 
    onSelectMethod,
    totalAmount 
}: PaymentMethodModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('cod');

    useEffect(() => {
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

    const handleConfirm = () => {
        onSelectMethod(selectedMethod);
        handleClose();
    };

    const paymentMethods = [
        {
            id: 'cod' as PaymentMethod,
            name: 'Cash on Delivery',
            description: 'Pay when you receive your order',
            icon: '💵',
        },
        {
            id: 'momo' as PaymentMethod,
            name: 'Momo E-Wallet',
            description: 'Pay via Momo QR Code',
            icon: '📱',
        },
        {
            id: 'card' as PaymentMethod,
            name: 'Credit/Debit Card',
            description: 'Pay with your bank card',
            icon: '💳',
        },
    ];

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
                    height: Dimensions.get('window').height * 0.7,
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
                <ScrollView contentContainerStyle={{ padding: 30 }}>
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
                            <Text className="h3-bold text-dark-100">Payment Method</Text>
                            <Text className="body-regular text-gray-200 mt-1">
                                Total: ${totalAmount.toFixed(2)}
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

                    {/* Payment Methods */}
                    <View style={{ gap: 15, marginBottom: 30 }}>
                        {paymentMethods.map((method) => (
                            <TouchableOpacity
                                key={method.id}
                                onPress={() => setSelectedMethod(method.id)}
                                style={{
                                    backgroundColor: selectedMethod === method.id ? '#FFF5E6' : 'white',
                                    borderWidth: 2,
                                    borderColor: selectedMethod === method.id ? '#FE8C00' : '#E0E0E0',
                                    borderRadius: 20,
                                    padding: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                {/* Icon */}
                                <View
                                    style={{
                                        width: 60,
                                        height: 60,
                                        borderRadius: 30,
                                        backgroundColor: selectedMethod === method.id ? '#FE8C00' : '#F3F4F6',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        marginRight: 15,
                                    }}
                                >
                                    <Text style={{ fontSize: 30 }}>{method.icon}</Text>
                                </View>

                                {/* Info */}
                                <View style={{ flex: 1 }}>
                                    <Text className="paragraph-bold text-dark-100">
                                        {method.name}
                                    </Text>
                                    <Text className="body-regular text-gray-200 mt-1">
                                        {method.description}
                                    </Text>
                                </View>

                                {/* Checkmark */}
                                {selectedMethod === method.id && (
                                    <View
                                        style={{
                                            width: 24,
                                            height: 24,
                                            borderRadius: 12,
                                            backgroundColor: '#FE8C00',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <Image
                                            source={images.check}
                                            style={{ width: 14, height: 14 }}
                                            resizeMode="contain"
                                            tintColor="white"
                                        />
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Info Box */}
                    <View
                        style={{
                            backgroundColor: '#FFF5E6',
                            borderRadius: 15,
                            padding: 15,
                            marginBottom: 20,
                        }}
                    >
                        <Text className="body-medium text-gray-200">
                            {selectedMethod === 'cod'
                                ? '💡 You will pay in cash when receiving your order'
                                : selectedMethod === 'momo'
                                ? '💡 A QR code will be generated. Scan to complete payment'
                                : '💡 Enter your card details to complete payment'}
                        </Text>
                    </View>

                    {/* Confirm Button */}
                    <TouchableOpacity
                        onPress={handleConfirm}
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                        }}
                    >
                        <Text className="base-bold text-white">
                            Confirm Payment Method
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default PaymentMethodModal;