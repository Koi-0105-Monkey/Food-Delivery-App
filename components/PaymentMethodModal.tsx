// components/PaymentMethodModal.tsx - FIXED VERSION

import React, { useEffect, useRef } from 'react';
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

export type PaymentMethod = 'cod' | 'qr' | 'card';

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

    // ✅ FIX: Prevent re-render during animation
    const handleSelect = (method: PaymentMethod) => {
        // Close first
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
            // Then call after animation completes
            onClose();
            setTimeout(() => {
                onSelectMethod(method);
            }, 100);
        });
    };

    if (!visible) return null;

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="none" 
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            {/* Backdrop - ✅ Remove onPress to prevent warning */}
            <View style={{ flex: 1 }}>
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </View>

            {/* Modal Content */}
            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Dimensions.get('window').height * 0.65,
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
                                Total: {totalAmount.toLocaleString('vi-VN')}đ
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
                    <View style={{ gap: 15 }}>
                        {/* QR Code Payment */}
                        <TouchableOpacity
                            onPress={() => handleSelect('qr')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'white',
                                borderWidth: 2,
                                borderColor: '#2F9B65',
                                borderRadius: 20,
                                padding: 20,
                            }}
                        >
                            <View
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 15,
                                    backgroundColor: '#E8F5E9',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 15,
                                }}
                            >
                                <Text style={{ fontSize: 32 }}>📱</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="base-bold text-dark-100">QR Code Payment</Text>
                                <Text className="body-regular text-gray-200">
                                    Scan QR to pay via banking app
                                </Text>
                            </View>
                            <Image
                                source={images.arrowRight}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        {/* Card Payment */}
                        <TouchableOpacity
                            onPress={() => handleSelect('card')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'white',
                                borderWidth: 2,
                                borderColor: '#FE8C00',
                                borderRadius: 20,
                                padding: 20,
                            }}
                        >
                            <View
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 15,
                                    backgroundColor: '#FFF5E6',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 15,
                                }}
                            >
                                <Image
                                    source={images.dollar}
                                    style={{ width: 30, height: 30 }}
                                    resizeMode="contain"
                                    tintColor="#FE8C00"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="base-bold text-dark-100">Debit/Credit Card</Text>
                                <Text className="body-regular text-gray-200">
                                    Pay with your bank card
                                </Text>
                            </View>
                            <Image
                                source={images.arrowRight}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        {/* Cash on Delivery */}
                        <TouchableOpacity
                            onPress={() => handleSelect('cod')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'white',
                                borderWidth: 2,
                                borderColor: '#878787',
                                borderRadius: 20,
                                padding: 20,
                            }}
                        >
                            <View
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 15,
                                    backgroundColor: '#F3F4F6',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 15,
                                }}
                            >
                                <Text style={{ fontSize: 32 }}>💵</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="base-bold text-dark-100">Cash on Delivery</Text>
                                <Text className="body-regular text-gray-200">
                                    Pay when you receive order
                                </Text>
                            </View>
                            <Image
                                source={images.arrowRight}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default PaymentMethodModal;