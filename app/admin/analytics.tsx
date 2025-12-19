// app/admin/analytics.tsx - DETAILED ANALYTICS WITH FULL DATA

import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Dimensions, RefreshControl, Animated, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { databases, appwriteConfig, client } from '@/lib/appwrite';
import { useFocusEffect } from 'expo-router';
import { LineChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

type TimeRange = '1day' | '1week' | '1month' | 'all';

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState({
        // Revenue breakdown
        totalRevenue: 0,
        todayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        
        // Comparison
        yesterdayRevenue: 0,
        lastWeekRevenue: 0,
        lastMonthRevenue: 0,
        
        // Growth rates
        todayGrowth: 0,
        weekGrowth: 0,
        monthGrowth: 0,
        
        // Order statistics
        totalOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        avgOrderValue: 0,
        
        // Payment methods
        topPaymentMethod: 'COD',
        paymentMethodsData: [] as any[],
        
        // Chart data
        last7DaysRevenue: [] as any[],
        last30DaysRevenue: [] as any[],
    });
    const [loading, setLoading] = useState(true);
    const [selectedRange, setSelectedRange] = useState<TimeRange>('1week');
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    useFocusEffect(
        React.useCallback(() => {
            loadAnalytics();
        }, [])
    );

    useEffect(() => {
        loadAnalytics();

        const unsubscribe = client.subscribe(
            `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.ordersCollectionId}.documents`,
            () => {
                loadAnalytics();
            }
        );

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();
    }, []);

    const loadAnalytics = async () => {
        try {
            setLoading(true);

            const orders = await databases.listDocuments(
                appwriteConfig.databaseId,
                appwriteConfig.ordersCollectionId
            );

            const paidOrders = orders.documents.filter(
                (order: any) => order.payment_status === 'paid' && order.order_status === 'confirmed'
            );

            const totalRevenue = paidOrders.reduce((sum: number, order: any) => sum + order.total, 0);
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Today
            const todayRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= today)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Yesterday
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayRevenue = paidOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= yesterday && date < today;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // This Week
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const weekRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= weekAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Last Week
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const lastWeekRevenue = paidOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= twoWeeksAgo && date < weekAgo;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // This Month
            const monthAgo = new Date();
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            const monthRevenue = paidOrders
                .filter((order: any) => new Date(order.$createdAt) >= monthAgo)
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Last Month
            const twoMonthsAgo = new Date();
            twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
            const lastMonthRevenue = paidOrders
                .filter((order: any) => {
                    const date = new Date(order.$createdAt);
                    return date >= twoMonthsAgo && date < monthAgo;
                })
                .reduce((sum: number, order: any) => sum + order.total, 0);

            // Growth calculations
            const todayGrowth = yesterdayRevenue > 0 
                ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
                : (todayRevenue > 0 ? 100 : 0);

            const weekGrowth = lastWeekRevenue > 0 
                ? ((weekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 
                : (weekRevenue > 0 ? 100 : 0);

            const monthGrowth = lastMonthRevenue > 0 
                ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
                : (monthRevenue > 0 ? 100 : 0);

            const avgOrderValue = totalRevenue / (paidOrders.length || 1);

            // Payment methods
            const paymentMethods: { [key: string]: number } = {};
            paidOrders.forEach((order: any) => {
                paymentMethods[order.payment_method] = (paymentMethods[order.payment_method] || 0) + 1;
            });
            const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) => 
                paymentMethods[a] > paymentMethods[b] ? a : b
            , 'COD');

            const paymentMethodsData = Object.entries(paymentMethods).map(([name, value]) => ({
                name: name.toUpperCase(),
                value,
                percentage: ((value / paidOrders.length) * 100).toFixed(1),
            }));

            // Last 7 days chart
            const last7DaysRevenue = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const dayOrders = paidOrders.filter((order: any) => {
                    const orderDate = new Date(order.$createdAt);
                    return orderDate >= date && orderDate < nextDate;
                });

                const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + order.total, 0);

                last7DaysRevenue.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    revenue: dayRevenue / 1000,
                });
            }

            // Last 30 days chart
            const last30DaysRevenue = [];
            for (let i = 29; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const dayOrders = paidOrders.filter((order: any) => {
                    const orderDate = new Date(order.$createdAt);
                    return orderDate >= date && orderDate < nextDate;
                });

                const dayRevenue = dayOrders.reduce((sum: number, order: any) => sum + order.total, 0);

                last30DaysRevenue.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    revenue: dayRevenue / 1000,
                });
            }

            // Order status counts
            const completedOrders = orders.documents.filter(
                (order: any) => order.order_status === 'confirmed'
            ).length;

            const cancelledOrders = orders.documents.filter(
                (order: any) => order.order_status === 'cancelled'
            ).length;

            setAnalytics({
                totalRevenue,
                todayRevenue,
                weekRevenue,
                monthRevenue,
                yesterdayRevenue,
                lastWeekRevenue,
                lastMonthRevenue,
                todayGrowth,
                weekGrowth,
                monthGrowth,
                totalOrders: paidOrders.length,
                completedOrders,
                cancelledOrders,
                avgOrderValue,
                topPaymentMethod,
                last7DaysRevenue,
                last30DaysRevenue,
                paymentMethodsData,
            });

        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const getChartData = () => {
        switch (selectedRange) {
            case '1day':
                return [analytics.last7DaysRevenue[analytics.last7DaysRevenue.length - 1]];
            case '1week':
                return analytics.last7DaysRevenue;
            case '1month':
                return analytics.last30DaysRevenue;
            default:
                return analytics.last30DaysRevenue;
        }
    };

    const getCurrentRevenue = () => {
        switch (selectedRange) {
            case '1day':
                return analytics.todayRevenue;
            case '1week':
                return analytics.weekRevenue;
            case '1month':
                return analytics.monthRevenue;
            default:
                return analytics.totalRevenue;
        }
    };

    const getCurrentGrowth = () => {
        switch (selectedRange) {
            case '1day':
                return analytics.todayGrowth;
            case '1week':
                return analytics.weekGrowth;
            case '1month':
                return analytics.monthGrowth;
            default:
                return 0;
        }
    };

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN') + 'đ';
    };

    const chartData = getChartData();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                <ScrollView 
                    contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadAnalytics} />
                    }
                >
                    {/* Header */}
                    <View style={{ marginBottom: 24 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#8B8B8B', letterSpacing: 0.5 }}>
                            ANALYTICS DASHBOARD
                        </Text>
                        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A', marginTop: 6 }}>
                            Revenue Insights
                        </Text>
                    </View>

                    {/* Revenue Overview Cards */}
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                        <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
                            <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600', marginBottom: 8 }}>
                                Total Revenue
                            </Text>
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' }}>
                                {formatCurrency(analytics.totalRevenue)}
                            </Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: 'white', borderRadius: 20, padding: 20 }}>
                            <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600', marginBottom: 8 }}>
                                Avg Order Value
                            </Text>
                            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' }}>
                                {formatCurrency(analytics.avgOrderValue)}
                            </Text>
                        </View>
                    </View>

                    {/* Period Revenue with Growth */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 24,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View
                                style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 14,
                                    backgroundColor: '#F59E0B15',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: 12,
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>💰</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Current Period Revenue
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' }}>
                                        {formatCurrency(getCurrentRevenue())}
                                    </Text>
                                </View>
                            </View>
                            <View
                                style={{
                                    backgroundColor: getCurrentGrowth() >= 0 ? '#E8F5E9' : '#FFE5E5',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 12,
                                }}
                            >
                                <Text style={{ 
                                    fontSize: 13, 
                                    fontWeight: '600', 
                                    color: getCurrentGrowth() >= 0 ? '#10B981' : '#EF4444' 
                                }}>
                                    {getCurrentGrowth() >= 0 ? '↑' : '↓'} {Math.abs(getCurrentGrowth()).toFixed(1)}%
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Line Chart */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.08,
                            shadowRadius: 12,
                            elevation: 3,
                        }}
                    >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' }}>
                                📈 Sales Report
                            </Text>
                        </View>

                        {/* Time Range Selector */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                            {(['1day', '1week', '1month', 'all'] as TimeRange[]).map((range) => (
                                <TouchableOpacity
                                    key={range}
                                    onPress={() => setSelectedRange(range)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 8,
                                        backgroundColor: selectedRange === range ? '#6366F1' : '#F3F4F6',
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 11,
                                            fontWeight: '600',
                                            color: selectedRange === range ? 'white' : '#8B8B8B',
                                        }}
                                    >
                                        {range === '1day' ? '1 Day' : range === '1week' ? '1 Week' : range === '1month' ? '1 Month' : 'All'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Chart */}
                        {chartData.length > 0 ? (
                            <LineChart
                                data={{
                                    labels: chartData.map(d => d.date),
                                    datasets: [
                                        {
                                            data: chartData.map(d => d.revenue || 0),
                                            color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                            strokeWidth: 3,
                                        },
                                    ],
                                }}
                                width={width - 80}
                                height={220}
                                chartConfig={{
                                    backgroundColor: '#ffffff',
                                    backgroundGradientFrom: '#ffffff',
                                    backgroundGradientTo: '#ffffff',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    style: {
                                        borderRadius: 16,
                                    },
                                    propsForDots: {
                                        r: '4',
                                        strokeWidth: '2',
                                        stroke: '#6366F1',
                                    },
                                }}
                                bezier
                                style={{
                                    marginVertical: 8,
                                    borderRadius: 16,
                                }}
                            />
                        ) : (
                            <Text style={{ fontSize: 14, color: '#8B8B8B', textAlign: 'center', paddingVertical: 40 }}>
                                No data available
                            </Text>
                        )}
                    </View>

                    {/* Order Statistics */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            📦 Order Statistics
                        </Text>
                        
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 4 }}>
                                    {analytics.totalOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Total Orders
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#10B981', marginBottom: 4 }}>
                                    {analytics.completedOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Completed
                                </Text>
                            </View>
                            <View style={{ flex: 1, backgroundColor: '#FFE5E5', borderRadius: 16, padding: 16 }}>
                                <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#EF4444', marginBottom: 4 }}>
                                    {analytics.cancelledOrders}
                                </Text>
                                <Text style={{ fontSize: 13, color: '#8B8B8B', fontWeight: '600' }}>
                                    Cancelled
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment Methods */}
                    <View
                        style={{
                            backgroundColor: 'white',
                            borderRadius: 24,
                            padding: 20,
                            marginBottom: 16,
                        }}
                    >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 16 }}>
                            💳 Payment Methods
                        </Text>
                        
                        {analytics.paymentMethodsData.map((method, index) => {
                            const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444'];
                            const color = colors[index % colors.length];
                            
                            return (
                                <View key={method.name} style={{ marginBottom: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ fontSize: 14, color: '#1A1A1A', fontWeight: '600' }}>
                                            {method.name}
                                        </Text>
                                        <Text style={{ fontSize: 14, color: '#8B8B8B' }}>
                                            {method.value} orders ({method.percentage}%)
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            height: 8,
                                            backgroundColor: '#F3F4F6',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: `${method.percentage}%`,
                                                height: '100%',
                                                backgroundColor: color,
                                            }}
                                        />
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </Animated.View>
        </SafeAreaView>
    );
};

export default AdminAnalytics;