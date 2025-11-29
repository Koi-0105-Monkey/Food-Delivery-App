import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    Image,
    TextInput,
    Alert,
    ScrollView,
    ActivityIndicator,
    ActionSheetIOS,
    Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { images } from '@/constants';
import useAuthStore from '@/store/auth.store';
import { updateUserProfile } from '@/lib/appwrite';
import { User } from '@/type';

interface EditProfileModalProps {
    visible: boolean;
    onClose: () => void;
}

const EditProfileModal = ({ visible, onClose }: EditProfileModalProps) => {
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const { user, setUser } = useAuthStore();

    const [form, setForm] = useState({
        name: user?.name || '',
        phone: user?.phone || '',
        avatarUri: user?.avatar || '',
    });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (visible) {
            // Reset form với thông tin hiện tại
            setForm({
                name: user?.name || '',
                phone: user?.phone || '',
                avatarUri: user?.avatar || '',
            });

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

    // 🔥 FIXED: Action Sheet để chọn Camera/Gallery
    const showImagePickerOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Take Photo', 'Choose from Library'],
                    cancelButtonIndex: 0,
                },
                async (buttonIndex) => {
                    if (buttonIndex === 1) {
                        await pickImageFromCamera();
                    } else if (buttonIndex === 2) {
                        await pickImageFromGallery();
                    }
                }
            );
        } else {
            // Android: Show custom alert
            Alert.alert(
                'Change Profile Photo',
                'Choose an option',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Take Photo',
                        onPress: pickImageFromCamera,
                    },
                    {
                        text: 'Choose from Library',
                        onPress: pickImageFromGallery,
                    },
                ],
                { cancelable: true }
            );
        }
    };

    // 🔥 FIXED: Chụp ảnh từ Camera
    const pickImageFromCamera = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need camera permissions to take a photo.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setForm(prev => ({ ...prev, avatarUri: result.assets[0].uri }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
        }
    };

    // 🔥 FIXED: Chọn ảnh từ Gallery
    const pickImageFromGallery = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'We need photo library permissions to choose a photo.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setForm(prev => ({ ...prev, avatarUri: result.assets[0].uri }));
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const handleSave = async () => {
        // Validation
        if (!form.name.trim()) {
            return Alert.alert('Error', 'Name cannot be empty.');
        }

        if (form.phone && !/^\+?[\d\s\-()]+$/.test(form.phone)) {
            return Alert.alert('Error', 'Please enter a valid phone number.');
        }

        setIsUpdating(true);

        try {
            if (!user) throw new Error('No user found');

            const updatedDoc = await updateUserProfile({
                userId: user.$id, 
                name: form.name.trim(),
                phone: form.phone.trim(),
                avatarUri: form.avatarUri,
            });

            setUser(updatedDoc as User);

            Alert.alert('Success', 'Profile updated successfully!');
            handleClose();
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setIsUpdating(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <TouchableOpacity
                style={{ flex: 1 }}
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

            <Animated.View
                style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: Dimensions.get('window').height * 0.75,
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
                    showsVerticalScrollIndicator={false}
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
                        <Text className="h3-bold text-dark-100">
                            Edit Profile
                        </Text>
                        <TouchableOpacity onPress={handleClose}>
                            <Image
                                source={images.arrowBack}
                                style={{ width: 24, height: 24, transform: [{ rotate: '90deg' }] }}
                                resizeMode="contain"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text className="paragraph-medium text-gray-200 mb-6">
                        Update your personal information 👤
                    </Text>

                    {/* Avatar Section */}
                    <View className="flex-center mb-8">
                        <View className="profile-avatar">
                            <Image
                                source={{ uri: form.avatarUri }}
                                className="size-full rounded-full"
                                resizeMode="cover"
                            />
                        </View>
                        {/* 🔥 FIXED: Click để chọn Camera/Gallery */}
                        <TouchableOpacity
                            onPress={showImagePickerOptions}
                            style={{
                                marginTop: 12,
                                backgroundColor: '#FFF5E6',
                                paddingHorizontal: 20,
                                paddingVertical: 10,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <Image
                                source={images.pencil}
                                style={{ width: 16, height: 16 }}
                                resizeMode="contain"
                                tintColor="#FE8C00"
                            />
                            <Text className="paragraph-semibold text-primary">
                                Change Photo
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Form */}
                    <View style={{ gap: 20 }}>
                        {/* Name */}
                        <View>
                            <Text className="label">Full Name *</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="Enter your full name"
                                value={form.name}
                                onChangeText={(text) =>
                                    setForm((prev) => ({ ...prev, name: text }))
                                }
                                placeholderTextColor="#888"
                            />
                        </View>

                        {/* Email (Read-only) */}
                        <View>
                            <Text className="label">Email Address</Text>
                            <View className="input border-gray-300 bg-gray-50">
                                <Text className="paragraph-semibold text-gray-200">
                                    {user?.email || ''}
                                </Text>
                            </View>
                            <Text className="body-regular text-gray-200 mt-1">
                                Email cannot be changed
                            </Text>
                        </View>

                        {/* Phone */}
                        <View>
                            <Text className="label">Phone Number (Optional)</Text>
                            <TextInput
                                className="input border-gray-300"
                                placeholder="e.g., +1 234 567 8900"
                                value={form.phone}
                                onChangeText={(text) =>
                                    setForm((prev) => ({ ...prev, phone: text }))
                                }
                                keyboardType="phone-pad"
                                placeholderTextColor="#888"
                            />
                        </View>
                    </View>

                    {/* Save Button */}
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={isUpdating}
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 25,
                            paddingVertical: 16,
                            alignItems: 'center',
                            marginTop: 30,
                        }}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="base-bold text-white">
                                Save Changes
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
                        <Text className="base-bold text-gray-200">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </Animated.View>
        </Modal>
    );
};

export default EditProfileModal;