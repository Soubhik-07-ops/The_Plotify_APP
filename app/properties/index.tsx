import { useEffect, useState } from "react";
import { SafeAreaView, FlatList, ActivityIndicator, View } from "react-native";
import { Card } from "@/components/Cards";
import { getProperties } from "@/lib/supabase-db";
import type { Property } from '@/lib/supabase-db';
import AppText from "@/components/ui/AppText";

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
              <AppText>No properties found.</AppText>
            </View>
          )
        }
        ListHeaderComponent={() => (
          <View className="px-5 mt-5 mb-2">
            <AppText className="text-xl font-playfair-bold text-black-300">All Properties</AppText>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default PropertiesIndex; 
