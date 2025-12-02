// components/QRCodePaymentModal.tsx - SIMPLE QR VERSION

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
    Alert,
    ActivityIndicator,
} from 'react-native';
import { images } from '@/constants';
import { createQRPayment, pollPaymentStatus } from '@/lib/payment';

interface QRCodePaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    totalAmount: number;
    orderNumber: string;
    orderId: string;
}

const QRCodePaymentModal = ({ 
    visible, 
    onClose, 
    onPaymentSuccess,
    totalAmount,
    orderNumber,
    orderId,
}: QRCodePaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    const [isLoading, setIsLoading] = useState(false);
    const [paymentData, setPaymentData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'momo' | 'agribank'>('momo');

    useEffect(() => {
        if (visible) {
            setPaymentData(null);
            
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

            initQRPayment();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const initQRPayment = async () => {
        try {
            setIsLoading(true);

            const result = await createQRPayment(orderNumber, totalAmount);

            if (result.success && result.momo) {
                setPaymentData(result);
                
                // Start polling
                startPolling();
            } else {
                throw new Error(result.message || 'Không thể tạo QR code');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể tạo thanh toán');
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const startPolling = async () => {
        try {
            const success = await pollPaymentStatus(orderId, 60);

            if (success) {
                Alert.alert(
                    'Thanh toán thành công! 🎉',
                    'Đơn hàng của bạn đã được xác nhận!'
                );
                onPaymentSuccess();
                handleClose();
            } else {
                Alert.alert(
                    'Hết thời gian chờ',
                    'Vui lòng kiểm tra đơn hàng trong mục Profile.'
                );
            }
        } catch (error) {
            console.error('Polling error:', error);
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

    if (!visible) return null;

    const currentPayment = activeTab === 'momo' ? paymentData?.momo : paymentData?.agribank;

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
                    <View style={{ flex: 1 }}>
                        <Text className="h3-bold text-dark-100">Quét mã QR thanh toán</Text>
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

                {/* Content */}
                {isLoading ? (
                    <View className="flex-1 flex-center">
                        <ActivityIndicator size="large" color="#FE8C00" />
                        <Text className="paragraph-medium text-gray-200 mt-4">
                            Đang tạo mã QR...
                        </Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
                        {/* Amount Display */}
                        <View
                            style={{
                                backgroundColor: '#FFF5E6',
                                borderRadius: 20,
                                padding: 20,
                                marginBottom: 20,
                                alignItems: 'center',
                            }}
                        >
                            <Text className="body-medium text-gray-200 mb-2">Số tiền thanh toán</Text>
                            <Text 
                                className="text-primary" 
                                style={{ 
                                    fontSize: 36,
                                    fontWeight: 'bold',
                                }}
                            >
                                {totalAmount.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>

                        {/* Payment Method Tabs */}
                        <View
                            style={{
                                flexDirection: 'row',
                                backgroundColor: '#F3F4F6',
                                borderRadius: 15,
                                padding: 4,
                                marginBottom: 20,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => setActiveTab('momo')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: activeTab === 'momo' ? '#D82D8B' : 'transparent',
                                }}
                            >
                                <Text
                                    className="paragraph-semibold text-center"
                                    style={{ color: activeTab === 'momo' ? 'white' : '#878787' }}
                                >
                                    📱 Ví Momo
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setActiveTab('agribank')}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: activeTab === 'agribank' ? '#2F9B65' : 'transparent',
                                }}
                            >
                                <Text
                                    className="paragraph-semibold text-center"
                                    style={{ color: activeTab === 'agribank' ? 'white' : '#878787' }}
                                >
                                    🏦 Agribank
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {currentPayment && (
                            <>
                                {/* Payment Info */}
                                <View
                                    style={{
                                        backgroundColor: '#F9FAFB',
                                        borderRadius: 15,
                                        padding: 15,
                                        marginBottom: 20,
                                    }}
                                >
                                    <Text className="paragraph-bold text-dark-100 mb-3">
                                        📋 Thông tin chuyển khoản:
                                    </Text>
                                    <View style={{ gap: 8 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text className="body-medium text-gray-200">Người nhận:</Text>
                                            <Text className="body-medium text-dark-100">
                                                {currentPayment.displayInfo.receiver}
                                            </Text>
                                        </View>
                                        {currentPayment.displayInfo.accountNo && (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text className="body-medium text-gray-200">Số TK:</Text>
                                                <Text className="body-medium text-dark-100">
                                                    {currentPayment.displayInfo.accountNo}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text className="body-medium text-gray-200">Số tiền:</Text>
                                            <Text className="body-medium text-primary">
                                                {currentPayment.displayInfo.amount.toLocaleString('vi-VN')}đ
                                            </Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text className="body-medium text-gray-200">Nội dung:</Text>
                                            <Text className="body-medium text-dark-100">
                                                {currentPayment.displayInfo.note}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {/* QR Code */}
                                <View
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: 20,
                                        padding: 20,
                                        alignItems: 'center',
                                        borderWidth: 2,
                                        borderColor: activeTab === 'momo' ? '#D82D8B' : '#2F9B65',
                                        marginBottom: 20,
                                    }}
                                >
                                    <Text className="base-bold text-dark-100 mb-4">
                                        {activeTab === 'momo' ? '📱 Quét bằng app Momo hoặc Banking' : '🏦 Quét bằng app Agribank'}
                                    </Text>
                                    <Image
                                        source={{ uri: currentPayment.qrCodeUrl }}
                                        style={{ width: 320, height: 320 }}
                                        resizeMode="contain"
                                    />
                                    <Text className="body-regular text-gray-200 mt-4 text-center">
                                        Số tiền và nội dung đã được điền sẵn
                                    </Text>
                                </View>

                                {/* Instructions */}
                                <View
                                    style={{
                                        backgroundColor: '#E8F5E9',
                                        borderRadius: 15,
                                        padding: 20,
                                        marginBottom: 20,
                                    }}
                                >
                                    <Text className="paragraph-bold text-dark-100 mb-3">
                                        ✅ Hướng dẫn thanh toán:
                                    </Text>
                                    <Text className="body-regular text-gray-200">
                                        1️⃣ Mở app {activeTab === 'momo' ? 'Momo/Banking' : 'Agribank'}{'\n'}
                                        2️⃣ Chọn "Quét mã QR"{'\n'}
                                        3️⃣ Quét mã QR phía trên{'\n'}
                                        4️⃣ Kiểm tra thông tin → Xác nhận{'\n'}
                                        5️⃣ Đợi xác nhận (tự động trong vài giây)
                                    </Text>
                                </View>

                                {/* Warning */}
                                <View
                                    style={{
                                        backgroundColor: '#FFF5E6',
                                        borderRadius: 15,
                                        padding: 15,
                                        flexDirection: 'row',
                                        alignItems: 'flex-start',
                                        gap: 10,
                                        marginBottom: 20,
                                    }}
                                >
                                    <Text style={{ fontSize: 24 }}>⚠️</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text className="body-medium text-dark-100">
                                            <Text className="base-bold">Quan trọng:</Text> Vui lòng{' '}
                                            <Text className="base-bold text-error">KHÔNG THAY ĐỔI</Text>
                                            {' '}số tiền và nội dung chuyển khoản để đơn hàng được xác nhận tự động!
                                        </Text>
                                    </View>
                                </View>

                                {/* Loading Animation */}
                                <View className="flex-center mt-10 mb-20">
                                    <ActivityIndicator size="large" color="#2F9B65" />
                                    <Text className="paragraph-medium text-gray-200 mt-4 text-center">
                                        Đang chờ xác nhận thanh toán...{'\n'}
                                        <Text className="body-regular">
                                            (Tự động cập nhật sau khi bạn chuyển tiền)
                                        </Text>
                                    </Text>
                                </View>
                            </>
                        )}
                    </ScrollView>
                )}
            </Animated.View>
        </Modal>
    );
};

export default QRCodePaymentModal;