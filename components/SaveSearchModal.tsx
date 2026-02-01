import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { notificationService } from '@/lib/notifications';
import { useGlobalContext } from '@/lib/global-provider';
import icons from '@/constants/icons';
import { Image } from 'react-native';
import { palette } from "@/constants/theme";
import { formatPriceINR } from '@/lib/formatters';

interface SaveSearchModalProps {
  visible: boolean;
  onClose: () => void;
  searchCriteria?: {
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    location?: string;
  };
}

const SaveSearchModal = ({ visible, onClose, searchCriteria }: SaveSearchModalProps) => {
  const { user } = useGlobalContext();
  const [searchName, setSearchName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveSearch = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save searches.');
      return;
    }

    if (!searchName.trim()) {
      Alert.alert('Error', 'Please enter a name for your search.');
      return;
    }

    setIsSubmitting(true);
    try {
      await notificationService.saveSearch(user.id, {
        name: searchName.trim(),
        criteria: searchCriteria || {},
        isActive: true,
      });

      Alert.alert(
        'Search Saved! 🔍',
        'You\'ll be notified when new properties match your criteria.',
        [
          {
            text: 'OK',
            onPress: () => {
              setSearchName('');
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error saving search:', error);
      Alert.alert('Error', 'Failed to save search. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCriteria = () => {
    if (!searchCriteria) return 'No criteria set';

    const parts = [];
    if (searchCriteria.location) parts.push(`📍 ${searchCriteria.location}`);
    if (searchCriteria.propertyType) parts.push(`🏠 ${searchCriteria.propertyType}`);
    if (searchCriteria.minPrice || searchCriteria.maxPrice) {
      const priceRange = [];
      if (searchCriteria.minPrice) priceRange.push(formatPriceINR(searchCriteria.minPrice));
      if (searchCriteria.maxPrice) priceRange.push(formatPriceINR(searchCriteria.maxPrice));
      parts.push(`💰 ${priceRange.join(' - ')}`);
    }
    if (searchCriteria.bedrooms) parts.push(`🛏️ ${searchCriteria.bedrooms}+ beds`);
    if (searchCriteria.bathrooms) parts.push(`🚿 ${searchCriteria.bathrooms}+ baths`);

    return parts.length > 0 ? parts.join('\n') : 'No criteria set';
  };

  const getCriteriaCount = () => {
    if (!searchCriteria) return 0;
    let count = 0;
    if (searchCriteria.location) count++;
    if (searchCriteria.propertyType) count++;
    if (searchCriteria.minPrice || searchCriteria.maxPrice) count++;
    if (searchCriteria.bedrooms) count++;
    if (searchCriteria.bathrooms) count++;
    return count;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-surface-100">
        {/* Header */}
        <LinearGradient colors={[palette.primary, palette.secondary]} className="flex-row items-center justify-between p-4 border-b border-border-subtle rounded-t-2xl">
          <TouchableOpacity onPress={onClose}>
            <Image source={icons.backArrow} className="w-6 h-6 tint-white" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold text-white">Save Search</Text>
          <View className="w-6" />
        </LinearGradient>

        <ScrollView className="flex-1 p-4">
          <View className="space-y-6">
            {/* Search Name */}
            <View>
              <Text className="text-base font-rubik-medium text-black-300 mb-2">
                Search Name *
              </Text>
              <TextInput
                value={searchName}
                onChangeText={setSearchName}
                placeholder="e.g., Downtown Apartments, Family Homes"
                className="border border-border-subtle rounded-lg p-3 text-base font-rubik bg-surface-200 text-black-300"
                placeholderTextColor={palette.textMuted}
                maxLength={50}
              />
              <Text className="text-xs font-rubik text-black-200 mt-1">
                Give your search a memorable name
              </Text>
            </View>

            {/* Search Criteria Preview */}
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-base font-rubik-medium text-black-300">
                  Search Criteria
                </Text>
                <View className="bg-primary-100 px-2 py-1 rounded-full">
                  <Text className="text-xs font-rubik-bold text-primary-300">
                    {getCriteriaCount()} criteria
                  </Text>
                </View>
              </View>
              <View className="bg-surface-200 rounded-lg p-4 border border-border-subtle">
                <Text className="font-rubik text-black-200 leading-6">
                  {formatCriteria()}
                </Text>
              </View>
            </View>

            {/* Benefits */}
            <View className="bg-surface-200 rounded-lg p-4 border border-border-subtle">
              <Text className="font-rubik-bold text-primary-300 text-base mb-2">
                🔔 Get Notified
              </Text>
              <Text className="font-rubik text-black-200 text-sm">
                You&apos;ll receive notifications when new properties match your criteria, so you never miss the perfect home!
              </Text>
            </View>

            {/* Notification Types */}
            <View>
              <Text className="text-base font-rubik-medium text-black-300 mb-3">
                You&apos;ll be notified for:
              </Text>
              <View className="space-y-2">
                <View className="flex-row items-center">
                  <Text className="text-lg mr-3">🆕</Text>
                  <Text className="font-rubik text-black-200">New properties matching your criteria</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-lg mr-3">💰</Text>
                  <Text className="font-rubik text-black-200">Price drops on matching properties</Text>
                </View>
                <View className="flex-row items-center">
                  <Text className="text-lg mr-3">🏠</Text>
                  <Text className="font-rubik text-black-200">Open houses for matching properties</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSaveSearch}
            disabled={isSubmitting || !searchName.trim()}
            className={`rounded-lg py-4 mt-6 ${isSubmitting || !searchName.trim()
                ? 'bg-surface-300'
                : 'bg-primary-300'
              }`}
          >
            <Text className="text-white text-center text-lg font-rubik-bold">
              {isSubmitting ? 'Saving...' : 'Save Search & Get Notified'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SaveSearchModal; 