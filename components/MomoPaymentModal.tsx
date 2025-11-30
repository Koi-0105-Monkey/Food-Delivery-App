// components/MomoPaymentModal.tsx - Proper Momo Payment Integration

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
    Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { images } from '@/constants';
import { createMomoPayment, pollPaymentStatus } from '@/lib/payment';

// ✅ Interface cho Momo Payment Response
interface MomoPaymentResult {
    success: boolean;
    payUrl?: string;
    deeplink?: string;
    qrCodeUrl?: string;
    message?: string;
}

interface MomoPaymentModalProps {
    visible: boolean;
    onClose: () => void;
    onPaymentSuccess: () => void;
    totalAmount: number;
    orderNumber: string;
    orderId: string;
}

const MomoPaymentModal = ({ 
    visible, 
    onClose, 
    onPaymentSuccess,
    totalAmount,
    orderNumber,
    orderId,
}: MomoPaymentModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    
    const [isLoading, setIsLoading] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
    const [showWebView, setShowWebView] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset state
            setPaymentUrl(null);
            setShowWebView(false);
            
            // Animate in
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

            // Tạo Momo payment request
            initMomoPayment();
        } else {
            slideAnim.setValue(Dimensions.get('window').height);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const initMomoPayment = async () => {
        try {
            setIsLoading(true);

            // ✅ Gọi Momo API
            const result = await createMomoPayment(
                orderNumber,
                totalAmount
            );

            if (result.success) {
                // ✅ Type-safe access với optional chaining
                if (result.payUrl) {
                    setPaymentUrl(result.payUrl);
                }
                
                // Option 1: Mở Momo app (nếu có deeplink)
                if (result.deeplink) {
                    const supported = await Linking.canOpenURL(result.deeplink);
                    if (supported) {
                        await Linking.openURL(result.deeplink);
                        // Bắt đầu polling
                        startPolling();
                    } else {
                        // Fallback: Show WebView
                        setShowWebView(true);
                    }
                } else if (result.payUrl) {
                    // Show WebView payment nếu không có deeplink
                    setShowWebView(true);
                } else {
                    throw new Error('Không nhận được payment URL từ Momo');
                }
            } else {
                throw new Error(result.message || 'Momo payment failed');
            }
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể tạo thanh toán Momo');
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const startPolling = async () => {
        try {
            // Polling mỗi 3 giây trong 3 phút (60 lần)
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
                    'Timeout',
                    'Không nhận được xác nhận thanh toán. Vui lòng kiểm tra lại.'
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

    const handleWebViewNavigationStateChange = (navState: any) => {
        // Check if redirected to success page
        if (navState.url.includes('payment-result')) {
            setShowWebView(false);
            startPolling();
        }
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
                        <Text className="h3-bold text-dark-100">Thanh toán Momo</Text>
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
                            Đang kết nối với Momo...
                        </Text>
                    </View>
                ) : showWebView && paymentUrl ? (
                    <WebView
                        source={{ uri: paymentUrl }}
                        style={{ flex: 1 }}
                        onNavigationStateChange={handleWebViewNavigationStateChange}
                    />
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 30 }}>
                        {/* Amount Display */}
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

                        {/* Instructions */}
                        <View
                            style={{
                                backgroundColor: '#E8F5E9',
                                borderRadius: 15,
                                padding: 20,
                            }}
                        >
                            <Text className="paragraph-bold text-dark-100 mb-3">
                                ✅ Đã mở app Momo
                            </Text>
                            <Text className="body-regular text-gray-200">
                                • Xác nhận thanh toán trong app Momo{'\n'}
                                • Đợi xác nhận (tự động){'\n'}
                                • Không đóng màn hình này
                            </Text>
                        </View>

                        {/* Loading Animation */}
                        <View className="flex-center mt-10">
                            <ActivityIndicator size="large" color="#2F9B65" />
                            <Text className="paragraph-medium text-gray-200 mt-4">
                                Đang chờ xác nhận thanh toán...
                            </Text>
                        </View>
                    </ScrollView>
                )}
            </Animated.View>
        </Modal>
    );
};

export default MomoPaymentModal;