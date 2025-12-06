// app/admin-login.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        if (!email.includes('@') || password.length < 6) {
            return Alert.alert('Error', 'Please enter valid credentials');
        }

        // ⚠️ Simple demo - Trong thực tế check role từ database
        if (email === 'admin@fastfood.com' && password === 'admin123') {
            setIsLoading(true);
            setTimeout(() => {
                router.push('/admin/dashboard');
            }, 1000);
        } else {
            Alert.alert('Access Denied', 'Invalid admin credentials');
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FE8C00' }}>
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 32 }}>
                {/* Logo */}
                <View style={{ alignItems: 'center', marginBottom: 48 }}>
                    <View style={{
                        width: 120,
                        height: 120,
                        backgroundColor: 'white',
                        borderRadius: 60,
                        alignItems: 'center',
                        justifyContent: 'center',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 10,
                    }}>
                        <Text style={{ fontSize: 64 }}>🍕</Text>
                    </View>
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white', marginTop: 24 }}>
                        Admin Portal
                    </Text>
                    <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
                        FastFood Management
                    </Text>
                </View>

                {/* Login Form */}
                <View style={{
                    backgroundColor: 'white',
                    borderRadius: 24,
                    padding: 32,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 12,
                    elevation: 8,
                }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#181C2E', marginBottom: 24 }}>
                        Welcome Back
                    </Text>
                    
                    {/* Email */}
                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                            Email
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: '#F5F5F5',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                                fontSize: 16,
                                color: '#181C2E',
                            }}
                            placeholder="admin@fastfood.com"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                    </View>

                    {/* Password */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#878787', marginBottom: 8 }}>
                            Password
                        </Text>
                        <TextInput
                            style={{
                                backgroundColor: '#F5F5F5',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingVertical: 16,
                                fontSize: 16,
                                color: '#181C2E',
                            }}
                            placeholder="Enter password"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={{
                            backgroundColor: '#FE8C00',
                            borderRadius: 12,
                            paddingVertical: 16,
                            alignItems: 'center',
                        }}
                        onPress={handleLogin}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                                Login to Dashboard
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Demo Credentials */}
                    <View style={{
                        marginTop: 24,
                        backgroundColor: '#E3F2FD',
                        borderRadius: 12,
                        padding: 16,
                    }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#1976D2', marginBottom: 8 }}>
                            🔑 Demo Credentials:
                        </Text>
                        <Text style={{ fontSize: 12, color: '#1976D2' }}>Email: admin@fastfood.com</Text>
                        <Text style={{ fontSize: 12, color: '#1976D2' }}>Password: admin123</Text>
                    </View>
                </View>

                {/* Back to App */}
                <TouchableOpacity
                    style={{ marginTop: 24, alignItems: 'center' }}
                    onPress={() => router.back()}
                >
                    <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                        ← Back to App
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

export default AdminLogin;