import { View, Text, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import CustomInput from '@/components/CustomInput';
import CustomButton from '@/components/CustomButton';
import { useState } from 'react';
import { signIn, signOut } from '@/lib/appwrite';
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

            await signIn({
                email: email.trim().toLowerCase(),
                password
            });

            console.log('✅ Sign in successful, fetching user...');

            // Fetch user data (includes role)
            await fetchAuthenticatedUser();

            // Get user from store to check role
            const { user, isAdmin } = useAuthStore.getState();

            console.log('✅ User fetched:', user?.email);
            console.log('🔐 Role:', user?.role);

            // 🚫 CHECK BAN STATUS
            if (user?.banExpiresAt && new Date(user.banExpiresAt) > new Date()) {
                const banDate = new Date(user.banExpiresAt);
                const isPermanent = banDate.getFullYear() > 3000;

                await signOut();
                useAuthStore.getState().setUser(null);

                Alert.alert(
                    'Account Banned',
                    isPermanent
                        ? 'Your account has been permanently banned from accessing this application.'
                        : `Your account is banned until ${banDate.toLocaleDateString()} ${banDate.toLocaleTimeString()}.`
                );
                return;
            }

            // ✅ Role-based redirect
            if (isAdmin) {
                console.log('🎯 Admin detected, redirecting to admin panel...');
                router.replace('/admin/dashboard');
            } else {
                console.log('🎯 Regular user, redirecting to home...');
                router.replace('/?showWelcome=signin');
            }

        } catch (error: any) {
            console.error('❌ Sign in error:', error);

            let errorMessage = 'Failed to sign in. Please check your credentials.';

            if (error.message?.includes('Invalid email or password')) {
                errorMessage = 'Invalid email or password. Please try again.';
            } else if (error.message?.includes('No account found')) {
                errorMessage = 'No account found with this email. Please sign up first.';
            } else if (error.message?.includes('blocked')) {
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