import { View, Text, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useState } from 'react';
import { signIn } from '@/lib/appwrite';
import useAuthStore from '@/store/auth.store';
import * as Sentry from '@sentry/react-native';

const SignIn = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [form, setForm] = useState({ email: '', password: '' });
    const { fetchAuthenticatedUser } = useAuthStore();

    const submit = async () => {
        const { email, password } = form;

        // Validation
        if (!email.trim() || !email.includes('@')) {
            return Alert.alert('Error', 'Please enter a valid email address.');
        }

        if (!password || password.length < 8) {
            return Alert.alert('Error', 'Please enter your password (minimum 8 characters).');
        }

        setIsSubmitting(true);

        try {
            console.log('🔐 Starting sign in...');
            
            // Sign in and wait for session to be established
            await signIn({ 
                email: email.trim().toLowerCase(), 
                password 
            });

            console.log('✅ Sign in successful, fetching user...');

            // Fetch user data and update auth state
            await fetchAuthenticatedUser();

            console.log('✅ User fetched, redirecting to home...');

            // Redirect to home với param để trigger modal
            router.replace('/?showWelcome=signin');

        } catch (error: any) {
            console.error('❌ Sign in error:', error);
            
            // Better error messages
            let errorMessage = 'Failed to sign in. Please check your credentials.';
            
            if (error.message?.includes('Invalid credentials')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message?.includes('user_not_found')) {
                errorMessage = 'No account found with this email. Please sign up first.';
            } else if (error.message?.includes('user_blocked')) {
                errorMessage = 'Your account has been blocked. Please contact support.';
            }
            
            Alert.alert('Sign In Failed', errorMessage);
            Sentry.captureException(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View className="gap-10 bg-white rounded-lg p-5 mt-5">
            <CustomInput
                placeholder="Enter your email"
                value={form.email}
                onChangeText={(text) => setForm((prev) => ({ ...prev, email: text }))}
                label="Email"
                keyboardType="email-address"
            />
            <CustomInput
                placeholder="Enter your password"
                value={form.password}
                onChangeText={(text) => setForm((prev) => ({ ...prev, password: text }))}
                label="Password"
                secureTextEntry={true}
            />

            <CustomButton
                title="Sign In"
                isLoading={isSubmitting}
                onPress={submit}
            />

            <View className="flex justify-center mt-5 flex-row gap-2">
                <Text className="base-regular text-gray-100">
                    Don't have an account?
                </Text>
                <Link href="/sign-up" className="base-bold text-primary">
                    Sign Up
                </Link>
            </View>
        </View>
    );
};

export default SignIn;