// components/PaymentMethodModal.tsx

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

export type PaymentMethod = 'cod' | 'momo' | 'card';

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

    const handleSelect = (method: PaymentMethod) => {
        onSelectMethod(method);
        handleClose();
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
                            <Text className="h3-bold text-dark-100">Chọn phương thức</Text>
                            <Text className="body-regular text-gray-200 mt-1">
                                Tổng: {totalAmount.toLocaleString('vi-VN')}đ
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
                        {/* Momo */}
                        <TouchableOpacity
                            onPress={() => handleSelect('momo')}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: 'white',
                                borderWidth: 2,
                                borderColor: '#A50064',
                                borderRadius: 20,
                                padding: 20,
                            }}
                        >
                            <View
                                style={{
                                    width: 60,
                                    height: 60,
                                    borderRadius: 15,
                                    backgroundColor: '#A50064',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginRight: 15,
                                }}
                            >
                                <Text style={{ fontSize: 28, color: 'white', fontWeight: 'bold' }}>
                                    M
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="base-bold text-dark-100">Ví Momo</Text>
                                <Text className="body-regular text-gray-200">
                                    Thanh toán qua ví điện tử Momo
                                </Text>
                            </View>
                            <Image
                                source={images.arrowRight}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        {/* Card */}
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
                                <Text className="base-bold text-dark-100">Thẻ ATM/Credit</Text>
                                <Text className="body-regular text-gray-200">
                                    Thanh toán bằng thẻ ngân hàng
                                </Text>
                            </View>
                            <Image
                                source={images.arrowRight}
                                style={{ width: 20, height: 20 }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>

                        {/* COD */}
                        <TouchableOpacity
                            onPress={() => handleSelect('cod')}
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
                                <Image
                                    source={images.dollar}
                                    style={{ width: 30, height: 30 }}
                                    resizeMode="contain"
                                    tintColor="#2F9B65"
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text className="base-bold text-dark-100">Tiền mặt (COD)</Text>
                                <Text className="body-regular text-gray-200">
                                    Thanh toán khi nhận hàng
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