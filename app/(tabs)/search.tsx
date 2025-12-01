// app/(tabs)/search.tsx - FIXED VERSION

import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppwrite from '@/lib/useAppwrite';
import { getCategories, getMenu } from '@/lib/appwrite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import CartButton from '@/components/CartButton';
import cn from 'clsx';
import MenuCard from '@/components/MenuCard';
import { MenuItem, Category } from '@/type';
import Filter from '@/components/Filter';
import SearchBar from '@/components/SearchBar';

const Search = () => {
    const { category, query } = useLocalSearchParams<{ query?: string; category?: string }>();

    const { data, refetch, loading } = useAppwrite({ 
        fn: getMenu, 
        params: { 
            category: category || '', 
            query: query || '', 
            limit: 6 
        } 
    });
    
    // ✅ FIXED: Add default empty array fallback
    const { data: categories } = useAppwrite({ 
        fn: getCategories,
        params: {} as any 
    });

    useEffect(() => {
        refetch({ 
            category: category || '', 
            query: query || '', 
            limit: 6 
        });
    }, [category, query]);

    // ✅ FIXED: Ensure categories is always an array
    const categoryList = (categories || []) as Category[];

    return (
        <SafeAreaView className="bg-white h-full">
            <FlatList
                data={data}
                renderItem={({ item, index }) => {
                    const isFirstRightColItem = index % 2 === 0;

                    return (
                        <View className={cn('flex-1 max-w-[48%]', !isFirstRightColItem ? 'mt-10' : 'mt-0')}>
                            <MenuCard item={item as MenuItem} />
                        </View>
                    );
                }}
                keyExtractor={(item) => item.$id}
                numColumns={2}
                columnWrapperClassName="gap-7"
                contentContainerClassName="gap-7 px-5 pb-32"
                ListHeaderComponent={() => (
                    <View className="my-5 gap-5">
                        <View className="flex-between flex-row w-full">
                            <View className="flex-start">
                                <Text className="small-bold uppercase text-primary">Search</Text>
                                <View className="flex-start flex-row gap-x-1 mt-0.5">
                                    <Text className="paragraph-semibold text-dark-100">
                                        Find your favorite food
                                    </Text>
                                </View>
                            </View>

                            <CartButton />
                        </View>

                        <SearchBar />

                        {/* ✅ FIXED: Pass categoryList instead of categories */}
                        <Filter categories={categoryList} />
                    </View>
                )}
                ListEmptyComponent={() => 
                    !loading ? (
                        <View className="flex-center py-20">
                            <Text className="paragraph-medium text-gray-200">No results found</Text>
                        </View>
                    ) : null
                }
            />
        </SafeAreaView>
    );
};

export default Search;