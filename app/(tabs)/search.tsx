// app/(tabs)/search.tsx - OPTIMIZED VERSION

import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useAppwrite from '@/lib/useAppwrite';
import { getCategories, getMenu } from '@/lib/appwrite';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import CartButton from '@/components/CartButton';
import cn from 'clsx';
import MenuCard from '@/components/MenuCard';
import { MenuItem, Category } from '@/type';
import Filter from '@/components/Filter';
import SearchBar from '@/components/SearchBar';

// ✅ FIX 2: Cache để tránh gọi API lại khi không cần
const cache = new Map<string, MenuItem[]>();

const Search = () => {
    const { category, query } = useLocalSearchParams<{ query?: string; category?: string }>();
    const [localData, setLocalData] = useState<MenuItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // ✅ FIX 3: Debounce search query
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { data: categories } = useAppwrite({ 
        fn: getCategories,
        params: {} as any 
    });

    const categoryList = (categories || []) as Category[];

    // ✅ Load data with caching
    const loadData = useCallback(async () => {
        const cacheKey = `${category || 'all'}-${query || ''}`;
        
        // Check cache first
        if (cache.has(cacheKey)) {
            console.log('✅ Using cached data for:', cacheKey);
            setLocalData(cache.get(cacheKey)!);
            return;
        }

        setIsLoading(true);
        try {
            const items = await getMenu({ 
                category: category || '', 
                query: query || ''
            });
            
            const menuItems = items as MenuItem[];
            cache.set(cacheKey, menuItems); // Save to cache
            setLocalData(menuItems);
            
            console.log(`✅ Loaded ${menuItems.length} items`);
        } catch (error) {
            console.error('Failed to load menu:', error);
        } finally {
            setIsLoading(false);
        }
    }, [category, query]);

    // ✅ Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current !== null) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            loadData();
        }, 500); // ✅ Wait 500ms before searching

        return () => {
            if (searchTimeoutRef.current !== null) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [category, query, loadData]);

    return (
        <SafeAreaView className="bg-white h-full">
            <FlatList
                data={localData}
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
                        <Filter categories={categoryList} />
                    </View>
                )}
                ListEmptyComponent={() => 
                    !isLoading ? (
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