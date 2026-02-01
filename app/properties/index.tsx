import { useEffect, useState } from "react";
import { SafeAreaView, FlatList, ActivityIndicator, View, Text } from "react-native";
import { Card } from "@/components/Cards";
import { getProperties } from "@/lib/supabase-db";
import type { Property } from '@/lib/supabase-db';

const PropertiesIndex = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProperties().then(props => {
      setProperties(props);
      setLoading(false);
    });
  }, []);

  return (
    <SafeAreaView className="h-full bg-white">
      <FlatList
        data={properties}
        numColumns={2}
        renderItem={({ item }) => <Card item={item} onPress={() => { }} />}
        keyExtractor={(item) => String(item.id ?? '')}
        contentContainerClassName="pb-32"
        columnWrapperClassName="flex gap-5 px-5"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" className="text-primary-300 mt-5" />
          ) : (
            <View className="flex-1 justify-center items-center mt-10">
              <Text>No properties found.</Text>
            </View>
          )
        }
        ListHeaderComponent={() => (
          <View className="px-5 mt-5 mb-2">
            <Text className="text-xl font-rubik-bold text-black-300">All Properties</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default PropertiesIndex; 