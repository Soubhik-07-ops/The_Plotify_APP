import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import icons from '@/constants/icons';
import { categories } from '@/constants/data';
import { submitPendingProperty } from '@/lib/supabase-db';
import { uploadImagesToSupabase } from '@/lib/supabase-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '@/constants/theme';

interface AddPropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onPropertyAdded: () => void;
  ownerId?: string; // Optional: User ID of the property owner/creator
}

const AddPropertyModal = ({ visible, onClose, onPropertyAdded, ownerId }: AddPropertyModalProps) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    price: '',
    type: 'Apartment',
    bedrooms: '',
    bathrooms: '',
    area: '',
    description: '',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop',
  });

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [customFacility, setCustomFacility] = useState('');
  const [images, setImages] = useState<string[]>([]); // For local image URIs
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomImageInput, setShowCustomImageInput] = useState(false);


  const facilities = [
    'Wifi', 'Gym', 'Swimming pool', 'Car Parking', 'Laundry', 'Garden', 'Concierge'
  ];

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImages(result.assets.map(asset => asset.uri));
    }
  };

  // Helper to upload images to Firebase Storage
  const uploadImagesToStorage = async (uris: string[]) => {
    try {
      console.log('Uploading images to Supabase Storage:', uris.length);
      const urls = await uploadImagesToSupabase(uris);
      console.log('Images uploaded successfully:', urls.length);
      return urls;
    } catch (error) {
      console.error('Supabase Storage upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload images. Please try again.');
      return [];
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Validate form
      if (!formData.name || !formData.address || !formData.price) {
        Alert.alert('Failed', 'Please fill in all required fields');
        setIsSubmitting(false);
        return;
      }

      let galleryUrls: string[] = [];
      if (images.length > 0) {
        galleryUrls = await uploadImagesToStorage(images);
        if (galleryUrls.length === 0) {
          setIsSubmitting(false);
          return; // Stop if upload failed
        }
      } else if (formData.image) {
        galleryUrls = [formData.image];
      }

      // Data validation: ensure all fields are serializable and not undefined
      const safeFacilities = Array.isArray(selectedFacilities) ? selectedFacilities.filter(Boolean) : [];
      const safeGallery = Array.isArray(galleryUrls)
        ? galleryUrls.filter(Boolean).map((url, idx) => ({ id: `${idx + 1}`, image: url }))
        : [];
      const safeImage = galleryUrls[0] || '';
      if (!safeImage) {
        Alert.alert('Failed', 'No image was uploaded.');
        setIsSubmitting(false);
        return;
      }

      // Parse address into location components
      const addressParts = formData.address.split(',').map(s => s.trim());
      const city = addressParts[0] || '';
      const state = addressParts.length > 1 ? addressParts[1] : '';
      const country = addressParts.length > 2 ? addressParts[2] : '';

      // Convert gallery to images array
      const imageUrls = safeGallery.map(g => g.image);

      // Prepare pending property data
      // Ensure property type is always first in categories array, followed by facilities
      const categoriesArray = [formData.type, ...safeFacilities];
      
      // Parse bedrooms and bathrooms - ensure they're numbers, not strings
      const bedroomsStr = (formData.bedrooms || '').trim();
      const bathroomsStr = (formData.bathrooms || '').trim();
      const bedrooms = bedroomsStr ? parseInt(bedroomsStr.replace(/[^0-9]/g, '')) : null;
      const bathrooms = bathroomsStr ? parseInt(bathroomsStr.replace(/[^0-9]/g, '')) : null;
      
      // Log parsed values for debugging
      console.log('📝 Form data - bedrooms input:', formData.bedrooms, '→ parsed:', bedrooms);
      console.log('📝 Form data - bathrooms input:', formData.bathrooms, '→ parsed:', bathrooms);
      
      const pendingPropertyData = {
        title: formData.name,
        country: country || 'Unknown',
        state: state || 'Unknown',
        city: city || 'Unknown',
        price: parseFloat(formData.price.replace(/[^0-9.]/g, '')) || 0,
        sqft: formData.area ? parseFloat(formData.area.replace(/[^0-9.]/g, '')) : 0,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        description: formData.description || 'Beautiful property with modern amenities.',
        categories: categoriesArray, // Property type is first, then facilities
        images: imageUrls,
        user_id: ownerId || '',
      };

      // Log the propertyData for debugging
      console.log('📝 Submitting property to pending_homes:', JSON.stringify(pendingPropertyData, null, 2));
      console.log('🛏️ Bedrooms:', bedrooms, '🚿 Bathrooms:', bathrooms);

      await submitPendingProperty(pendingPropertyData);
      console.log('Property submitted for approval!');
      Alert.alert('Success', 'Property submitted for approval. You will be notified once it is reviewed.');
      onPropertyAdded();
      onClose();
      // Reset form
      setFormData({
        name: '',
        address: '',
        price: '',
        type: 'Apartment',
        bedrooms: '',
        bathrooms: '',
        area: '',
        description: '',
        image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&h=300&fit=crop',
      });
      setImages([]);
      setSelectedFacilities([]);
      setShowCustomImageInput(false);
    } catch (error) {
      // Enhanced error logging
      console.error('Add Property Error:', error);
      if (error instanceof Error) {
        Alert.alert('Failed', error.message);
      } else if (typeof error === 'string') {
        Alert.alert('Failed', error);
      } else {
        Alert.alert('Failed', 'Failed to add property. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFacility = (facility: string) => {
    if (selectedFacilities.includes(facility)) {
      setSelectedFacilities(selectedFacilities.filter(f => f !== facility));
    } else {
      setSelectedFacilities([...selectedFacilities, facility]);
    }
  };

  const _selectImage = (imageUrl: string) => {
    setFormData({ ...formData, image: imageUrl });
    setShowCustomImageInput(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
        {/* Gradient Header */}
        <LinearGradient colors={[palette.primary, palette.secondary]} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border }}>
          <TouchableOpacity onPress={onClose}>
            <Image source={icons.backArrow} style={{ width: 24, height: 24, tintColor: '#0B0F17' }} />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0B0F17' }}>Add New Property</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 20) + 100
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ gap: 16 }}>
              {/* Property Name */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Property Name *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingHorizontal: 12 }}>
                  <Image source={icons.home} style={{ width: 20, height: 20, marginRight: 8, tintColor: palette.primary }} />
                  <TextInput
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                    placeholder="Enter property name"
                    placeholderTextColor={palette.textMuted}
                    style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: palette.textPrimary }}
                  />
                </View>
              </View>

              {/* Address */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Address *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingHorizontal: 12 }}>
                  <Image source={icons.location} style={{ width: 20, height: 20, marginRight: 8, tintColor: palette.primary }} />
                  <TextInput
                    value={formData.address}
                    onChangeText={(text) => setFormData({ ...formData, address: text })}
                    placeholder="Enter property address"
                    placeholderTextColor={palette.textMuted}
                    style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: palette.textPrimary }}
                  />
                </View>
              </View>

              {/* Price */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Price *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceMuted, borderWidth: 1, borderColor: palette.border, borderRadius: 12, paddingHorizontal: 12 }}>
                  <Image source={icons.wallet} style={{ width: 20, height: 20, marginRight: 8, tintColor: palette.primary }} />
                  <TextInput
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="Enter price (e.g., 2,500)"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    style={{ flex: 1, paddingVertical: 12, fontSize: 16, color: palette.textPrimary }}
                  />
                </View>
              </View>

              {/* Property Images */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Property Photos</Text>
                <View style={{ marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
                  {images.length > 0 ? (
                    images.map((uri, idx) => (
                      <Image key={idx} source={{ uri }} style={{ width: 96, height: 96, borderRadius: 12, marginRight: 8, marginBottom: 8 }} resizeMode="cover" />
                    ))
                  ) : (
                    <Image source={{ uri: formData.image }} style={{ width: 96, height: 96, borderRadius: 12, marginRight: 8, marginBottom: 8 }} resizeMode="cover" />
                  )}
                </View>
                <TouchableOpacity
                  onPress={pickImages}
                  style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, marginBottom: 8 }}
                >
                  <Text style={{ color: palette.primary, textAlign: 'center', fontWeight: '500' }}>Select Photos</Text>
                </TouchableOpacity>
              </View>

              {/* Property Type */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Property Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {categories.slice(1).map((category) => (
                      <TouchableOpacity
                        key={category.category}
                        onPress={() => setFormData({ ...formData, type: category.category })}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 8,
                          borderRadius: 20,
                          backgroundColor: formData.type === category.category ? palette.primary : palette.surfaceMuted,
                          borderWidth: 1,
                          borderColor: formData.type === category.category ? palette.primary : palette.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: formData.type === category.category ? '#0B0F17' : palette.textPrimary,
                            fontWeight: formData.type === category.category ? 'bold' : 'normal',
                          }}
                        >
                          {category.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Bedrooms and Bathrooms */}
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Bedrooms</Text>
                  <TextInput
                    value={formData.bedrooms}
                    onChangeText={(text) => setFormData({ ...formData, bedrooms: text })}
                    placeholder="2"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Bathrooms</Text>
                  <TextInput
                    value={formData.bathrooms}
                    onChangeText={(text) => setFormData({ ...formData, bathrooms: text })}
                    placeholder="2"
                    placeholderTextColor={palette.textMuted}
                    keyboardType="numeric"
                    style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                  />
                </View>
              </View>

              {/* Area */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Area (sqft)</Text>
                <TextInput
                  value={formData.area}
                  onChangeText={(text) => setFormData({ ...formData, area: text })}
                  placeholder="1200"
                  placeholderTextColor={palette.textMuted}
                  keyboardType="numeric"
                  style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted }}
                />
              </View>

              {/* Description */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Description</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Enter property description"
                  placeholderTextColor={palette.textMuted}
                  multiline
                  numberOfLines={4}
                  style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted, minHeight: 100 }}
                />
              </View>

              {/* Facilities */}
              <View>
                <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Facilities</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {facilities.map((facility) => (
                    <TouchableOpacity
                      key={facility}
                      onPress={() => toggleFacility(facility)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selectedFacilities.includes(facility) ? palette.primary : palette.surfaceMuted,
                        borderWidth: 1,
                        borderColor: selectedFacilities.includes(facility) ? palette.primary : palette.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          color: selectedFacilities.includes(facility) ? '#0B0F17' : palette.textPrimary,
                          fontWeight: selectedFacilities.includes(facility) ? 'bold' : 'normal',
                        }}
                      >
                        {facility}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Custom facility input */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
                  <TextInput
                    value={customFacility}
                    onChangeText={setCustomFacility}
                    placeholder="Add custom facility"
                    placeholderTextColor={palette.textMuted}
                    style={{ flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surfaceMuted, marginRight: 8 }}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      if (customFacility.trim() && !selectedFacilities.includes(customFacility.trim())) {
                        setSelectedFacilities([...selectedFacilities, customFacility.trim()]);
                        setCustomFacility('');
                      }
                    }}
                    style={{ backgroundColor: palette.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 }}
                  >
                    <Text style={{ color: '#0B0F17', fontWeight: 'bold' }}>Add</Text>
                  </TouchableOpacity>
                </View>
                {/* Show selected facilities as removable chips */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  {selectedFacilities.map((facility, idx) => (
                    <View key={facility + idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: palette.surfaceMuted, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: palette.border }}>
                      <Text style={{ color: palette.primary, fontWeight: '500', marginRight: 8 }}>{facility}</Text>
                      <TouchableOpacity onPress={() => setSelectedFacilities(selectedFacilities.filter(f => f !== facility))}>
                        <Text style={{ color: palette.primary, fontWeight: 'bold' }}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 16, marginTop: 24 }}
              disabled={isSubmitting}
            >
              <Text style={{ color: '#0B0F17', textAlign: 'center', fontSize: 18, fontWeight: 'bold' }}>
                {isSubmitting ? 'Adding...' : 'Add Property'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default AddPropertyModal; 