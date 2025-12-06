// app/admin/dashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '@/constants';
import { databases, appwriteConfig } from '@/lib/appwrite';
import { Query } from 'react-native-appwrite';

const { width } = Dimensions.get('window');

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        todayOrders: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        pendingOrders: 0,
        completedOrders: 0,
        totalCustomers: 0,
        totalMenuItems: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardStats();
    }, []);

    const loadDashboardStats = async () => {
        try {
            setLoading(true);

            // Get all orders
            const allOrders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId
            );

            // Get today's orders
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = allOrders.documents.filter((order: any) => 
                new Date(order.$createdAt) >= today
            );

            // Calculate revenues
            const totalRevenue = allOrders.documents.reduce(
                (sum: number, order: any) => sum + (order.payment_status === 'paid' ? order.total : 0),
                0
            );
            const todayRevenue = todayOrders.reduce(
                (sum: number, order: any) => sum + (order.payment_status === 'paid' ? order.total : 0),
                0
            );

            // Get customers
            const customers = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.userCollectionId
            );

            // Get menu items
            const menuItems = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.menuCollectionId
            );

            // Pending orders
            const pendingOrders = allOrders.documents.filter(
                (order: any) => order.payment_status === 'pending'
            ).length;

            // Completed orders
            const completedOrders = allOrders.documents.filter(
                (order: any) => order.payment_status === 'paid'
            ).length;

            setStats({
                totalOrders: allOrders.total,
                todayOrders: todayOrders.length,
                totalRevenue,
                todayRevenue,
                pendingOrders,
                completedOrders,
                totalCustomers: customers.total,
                totalMenuItems: menuItems.total,
            });
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ 
        title, 
        value, 
        icon, 
        color, 
        trend 
    }: { 
        title: string; 
        value: string; 
        icon: any; 
        color: string; 
        trend?: string;
    }) => (
        <View
            style={{
                width: (width - 60) / 2,
                backgroundColor: 'white',
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 3,
            }}
        >
            <View
                style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: color + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                }}
            >
                <Image source={icon} style={{ width: 24, height: 24 }} tintColor={color} />
            </View>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginBottom: 4 }}>
                {value}
            </Text>
            <Text style={{ fontSize: 14, color: '#878787' }}>{title}</Text>
            {trend && (
                <Text style={{ fontSize: 12, color: '#2F9B65', marginTop: 4 }}>
                    {trend}
                </Text>
            )}
        </View>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F5F5' }}>
            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
                {/* Header */}
                <View style={{ marginBottom: 24 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FE8C00' }}>
                        ADMIN DASHBOARD
                    </Text>
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#181C2E', marginTop: 4 }}>
                        Overview
                    </Text>
                    <Text style={{ fontSize: 14, color: '#878787', marginTop: 4 }}>
                        {new Date().toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </Text>
                </View>

                {/* Quick Stats */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    <StatCard
                        title="Today's Orders"
                        value={stats.todayOrders.toString()}
                        icon={images.bag}
                        color="#FE8C00"
                        trend="↑ 12% from yesterday"
                    />
                    <StatCard
                        title="Today's Revenue"
                        value={`${(stats.todayRevenue / 1000).toFixed(0)}K`}
                        icon={images.dollar}
                        color="#2F9B65"
                        trend="↑ 8% from yesterday"
                    />
                    <StatCard
                        title="Pending Orders"
                        value={stats.pendingOrders.toString()}
                        icon={images.clock}
                        color="#F14141"
                    />
                    <StatCard
                        title="Completed"
                        value={stats.completedOrders.toString()}
                        icon={images.check}
                        color="#2F9B65"
                    />
                </View>

                {/* Overall Stats */}
                <View
                    style={{
                        backgroundColor: 'white',
                        borderRadius: 20,
                        padding: 20,
                        marginTop: 8,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 8,
                        elevation: 3,
                    }}
                >
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginBottom: 16 }}>
                        Overall Statistics
                    </Text>
                    
                    <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Total Orders:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                {stats.totalOrders}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Total Revenue:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#2F9B65' }}>
                                {stats.totalRevenue.toLocaleString('vi-VN')}đ
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Total Customers:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                {stats.totalCustomers}
                            </Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, color: '#878787' }}>Menu Items:</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#181C2E' }}>
                                {stats.totalMenuItems}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={{ marginTop: 24 }}>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#181C2E', marginBottom: 16 }}>
                        Quick Actions
                    </Text>
                    
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#FE8C00',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                minWidth: (width - 60) / 2 - 6,
                            }}
                        >
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>📦</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                View Orders
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#2F9B65',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                minWidth: (width - 60) / 2 - 6,
                            }}
                        >
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>🍔</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                Manage Menu
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#0EA5E9',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                minWidth: (width - 60) / 2 - 6,
                            }}
                        >
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                Analytics
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={{
                                flex: 1,
                                backgroundColor: '#8B5CF6',
                                borderRadius: 16,
                                padding: 16,
                                alignItems: 'center',
                                minWidth: (width - 60) / 2 - 6,
                            }}
                        >
                            <Text style={{ fontSize: 32, marginBottom: 8 }}>👥</Text>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: 'white' }}>
                                Customers
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default Dashboard;