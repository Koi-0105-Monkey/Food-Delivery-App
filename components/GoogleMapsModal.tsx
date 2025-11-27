import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    PanResponder,
    ActivityIndicator,
    PanResponderGestureState,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { images } from '@/constants';

interface GoogleMapsModalProps {
    visible: boolean;
    onClose: () => void;
    address: string;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_HEIGHT = SCREEN_HEIGHT * 0.7; // 70%
const MAX_HEIGHT = SCREEN_HEIGHT * 0.95; // 95%
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

const GoogleMapsModal = ({ visible, onClose, address }: GoogleMapsModalProps) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const heightAnim = useRef(new Animated.Value(MIN_HEIGHT)).current;
    const [currentHeight, setCurrentHeight] = useState(MIN_HEIGHT);
    const [isLoading, setIsLoading] = useState(true);

    // Pan Responder for dragging
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderMove: (_evt, gestureState: PanResponderGestureState) => {
                const newHeight = currentHeight - gestureState.dy;
                
                // Limit height between MIN and MAX
                if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
                    heightAnim.setValue(newHeight);
                }
            },
            onPanResponderRelease: (_evt, gestureState: PanResponderGestureState) => {
                const newHeight = currentHeight - gestureState.dy;
                
                // Snap to closest position
                let targetHeight = currentHeight;
                
                if (newHeight < MIN_HEIGHT + 50) {
                    targetHeight = MIN_HEIGHT;
                } else if (newHeight > MAX_HEIGHT - 50) {
                    targetHeight = MAX_HEIGHT;
                } else if (gestureState.dy > 0) {
                    // Swiped down
                    targetHeight = MIN_HEIGHT;
                } else {
                    // Swiped up
                    targetHeight = MAX_HEIGHT;
                }

                Animated.spring(heightAnim, {
                    toValue: targetHeight,
                    useNativeDriver: false,
                    tension: 50,
                    friction: 8,
                }).start();
                
                setCurrentHeight(targetHeight);
            },
        })
    ).current;

    useEffect(() => {
        if (visible) {
            // Reset height
            setCurrentHeight(MIN_HEIGHT);
            heightAnim.setValue(MIN_HEIGHT);
            setIsLoading(true);

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
        } else {
            slideAnim.setValue(SCREEN_HEIGHT);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
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

    // Encode address for Google Maps
    const encodedAddress = encodeURIComponent(address);

    // Generate HTML with Google Maps JavaScript API
    const mapHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            html, body {
                height: 100%;
                width: 100%;
                overflow: hidden;
            }
            #map {
                height: 100%;
                width: 100%;
            }
            .info-window {
                padding: 10px;
                max-width: 200px;
            }
            .info-window h3 {
                margin: 0 0 5px 0;
                color: #FE8C00;
                font-size: 16px;
            }
            .info-window p {
                margin: 0;
                color: #666;
                font-size: 14px;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        
        <script>
            let map;
            let marker;
            let geocoder;

            function initMap() {
                geocoder = new google.maps.Geocoder();
                
                // Default center (will be updated after geocoding)
                const defaultCenter = { lat: 45.8150, lng: 15.9819 }; // Zagreb, Croatia
                
                map = new google.maps.Map(document.getElementById('map'), {
                    center: defaultCenter,
                    zoom: 15,
                    mapTypeControl: true,
                    mapTypeControlOptions: {
                        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                        position: google.maps.ControlPosition.TOP_RIGHT,
                    },
                    streetViewControl: true,
                    fullscreenControl: false,
                    zoomControl: true,
                });

                // Geocode the address
                geocodeAddress('${encodedAddress}');
            }

            function geocodeAddress(address) {
                geocoder.geocode({ address: decodeURIComponent(address) }, (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        
                        // Center map on location
                        map.setCenter(location);
                        
                        // Add marker
                        marker = new google.maps.Marker({
                            map: map,
                            position: location,
                            animation: google.maps.Animation.DROP,
                            icon: {
                                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                                scaledSize: new google.maps.Size(50, 50),
                            }
                        });

                        // Add info window
                        const infoWindow = new google.maps.InfoWindow({
                            content: \`
                                <div class="info-window">
                                    <h3>📍 Your Delivery Location</h3>
                                    <p>\${results[0].formatted_address}</p>
                                </div>
                            \`,
                        });

                        // Show info window by default
                        infoWindow.open(map, marker);

                        // Click marker to toggle info window
                        marker.addListener('click', () => {
                            infoWindow.open(map, marker);
                        });

                        // Notify React Native that map is loaded
                        window.ReactNativeWebView.postMessage('MAP_LOADED');
                    } else {
                        console.error('Geocoding failed:', status);
                        // Notify error
                        window.ReactNativeWebView.postMessage('GEOCODE_ERROR');
                    }
                });
            }
        </script>
        
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&libraries=places" async defer></script>
    </body>
    </html>
    `;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            {/* Backdrop */}
            <TouchableOpacity
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
                activeOpacity={1}
                onPress={handleClose}
            >
                <Animated.View
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        opacity: opacityAnim,
                    }}
                />
            </TouchableOpacity>

            {/* Modal Content */}
            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: heightAnim,
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
                {/* Drag Handle */}
                <View {...panResponder.panHandlers}>
                    <View
                        style={{
                            width: '100%',
                            paddingVertical: 12,
                            alignItems: 'center',
                        }}
                    >
                        <View
                            style={{
                                width: 40,
                                height: 4,
                                backgroundColor: '#D1D5DB',
                                borderRadius: 2,
                            }}
                        />
                    </View>
                </View>

                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 20,
                        paddingBottom: 15,
                        borderBottomWidth: 1,
                        borderBottomColor: '#F3F4F6',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                            flex: 1,
                        }}
                    >
                        <Image
                            source={images.location}
                            style={{ width: 24, height: 24 }}
                            resizeMode="contain"
                            tintColor="#FE8C00"
                        />
                        <View style={{ flex: 1 }}>
                            <Text className="small-bold text-primary">YOUR LOCATION</Text>
                            <Text className="paragraph-medium text-dark-100" numberOfLines={1}>
                                {address}
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        onPress={handleClose}
                        style={{
                            width: 40,
                            height: 40,
                            borderRadius: 20,
                            backgroundColor: '#F3F4F6',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        <Image
                            source={images.arrowBack}
                            style={{ width: 20, height: 20, transform: [{ rotate: '90deg' }] }}
                            resizeMode="contain"
                        />
                    </TouchableOpacity>
                </View>

                {/* Google Maps WebView */}
                <View style={{ flex: 1, position: 'relative' }}>
                    <WebView
                        source={{ html: mapHTML }}
                        style={{ flex: 1 }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        onMessage={(event) => {
                            if (event.nativeEvent.data === 'MAP_LOADED') {
                                setIsLoading(false);
                            }
                        }}
                    />

                    {/* Loading Overlay */}
                    {isLoading && (
                        <View
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: 'white',
                            }}
                        >
                            <ActivityIndicator size="large" color="#FE8C00" />
                            <Text className="paragraph-medium text-gray-200" style={{ marginTop: 10 }}>
                                Loading map...
                            </Text>
                        </View>
                    )}
                </View>

                {/* Tip */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        paddingVertical: 12,
                        borderTopWidth: 1,
                        borderTopColor: '#F3F4F6',
                    }}
                >
                    <Image
                        source={images.arrowDown}
                        style={{ width: 16, height: 16, transform: [{ rotate: '180deg' }] }}
                        resizeMode="contain"
                        tintColor="#878787"
                    />
                    <Text className="body-regular text-gray-200">
                        Swipe up to expand, swipe down to collapse
                    </Text>
                </View>
            </Animated.View>
        </Modal>
    );
};

export default GoogleMapsModal;