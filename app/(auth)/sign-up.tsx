import { View, Text, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useState } from 'react';
import { createUser } from '@/lib/appwrite';
import SuccessModal from '@/components/SuccessModal';
import useAuthStore from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';

const SignUp = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const { fetchAuthenticatedUser } = useAuthStore();

    const submit = async () => {
        const { name, email, password } = form;

        // Validation
        if (!name.trim()) {
            return Alert.alert('Error', 'Please enter your full name.');
        }

        if (!email.trim() || !email.includes('@')) {
            return Alert.alert('Error', 'Please enter a valid email address.');
        }

        if (password.length < 8) {
            return Alert.alert('Error', 'Password must be at least 8 characters long.');
        }

        setIsSubmitting(true);

        try {
            console.log('📝 Starting sign up...');
            
            // Create user and establish session
            await createUser({ 
                email: email.trim().toLowerCase(), 
                password, 
                name: name.trim() 
            });

            console.log('✅ Sign up successful, fetching user...');

            // Fetch user data and update auth state
            await fetchAuthenticatedUser();

            console.log('✅ User fetched, showing success modal');

            // Show success modal
            setShowSuccessModal(true);

            // Auto close modal and redirect after 3 seconds
            setTimeout(() => {
                setShowSuccessModal(false);
                router.replace('/');
            }, 3000);

        } catch (error: any) {
            console.error('❌ Sign up error:', error);
            
            // Better error messages
            let errorMessage = 'Failed to create account. Please try again.';
            
            if (error.message?.includes('user_already_exists')) {
                errorMessage = 'An account with this email already exists.';
            } else if (error.message?.includes('Invalid email')) {
                errorMessage = 'Please enter a valid email address.';
            } else if (error.message?.includes('password')) {
                errorMessage = 'Password must be at least 8 characters long.';
            }
            
            Alert.alert('Sign Up Failed', errorMessage);
            Sentry.captureException(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <View className="gap-10 bg-white rounded-lg p-5 mt-5">
                <CustomInput
                    placeholder="Enter your full name"
                    value={form.name}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, name: text }))}
                    label="Full name"
                />
                <CustomInput
                    placeholder="Enter your email"
                    value={form.email}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
                    label="Email"
                    keyboardType="email-address"
                />
                <CustomInput
                    placeholder="Enter your password (min 8 characters)"
                    value={form.password}
                    onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
                    label="Password"
                    secureTextEntry={true}
                />

                <CustomButton
                    title="Sign Up"
                    isLoading={isSubmitting}
                    onPress={submit}
                />

                <View className="flex justify-center mt-5 flex-row gap-2">
                    <Text className="base-regular text-gray-100">
                        Already have an account?
                    </Text>
                    <Link href="/sign-in" className="base-bold text-primary">
                        Sign In
                    </Link>
                </View>
            </View>

            <SuccessModal
                visible={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.replace('/');
                }}
                title="Welcome Aboard! 🎉"
                message="Your account has been created successfully. Get ready to explore delicious food options!"
                type="signup"
            />
        </>
    );
};

export default SignUp;