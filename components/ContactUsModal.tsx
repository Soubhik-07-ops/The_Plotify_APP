import React, { useState } from 'react';
import {
  Modal,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '@/components/ui/AppText';
import BackButton from '@/components/ui/BackButton';
import { palette } from '@/constants/theme';
import { submitContact } from '@/lib/supabase-db';

interface ContactUsModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
  userName?: string;
}

const ContactUsModal = ({ visible, onClose, userEmail, userName }: ContactUsModalProps) => {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    first_name: userName?.split(' ')[0] || '',
    last_name: userName?.split(' ').slice(1).join(' ') || '',
    email: userEmail || '',
    phone: '',
    message: '',
  });
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services = [
    'Property Listing',
    'Property Search',
    'Property Valuation',
    'Buying Assistance',
    'Selling Assistance',
    'Rental Services',
    'Legal Support',
    'Other',
  ];

  const toggleService = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
    } else {
      setSelectedServices([...selectedServices, service]);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.phone || !formData.message) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (selectedServices.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one service');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContact({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        services: selectedServices,
      });

      Alert.alert('Success', 'Your message has been submitted. We will get back to you soon!');

      // Reset form
      setFormData({
        first_name: userName?.split(' ')[0] || '',
        last_name: userName?.split(' ').slice(1).join(' ') || '',
        email: userEmail || '',
        phone: '',
        message: '',
      });
      setSelectedServices([]);
      onClose();
    } catch (error: any) {
      console.error('Error submitting contact:', error);
      Alert.alert('Error', error.message || 'Failed to submit your message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          <BackButton onPress={onClose} color="#0B0F17" style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(11,15,23,0.08)' }} />
          <AppText style={{ fontSize: 20, fontWeight: 'bold', color: '#0B0F17' }} weight="bold">Contact Us</AppText>
          <View style={{ width: 40 }} />
        </LinearGradient>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top}
        >
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <AppText style={{ fontSize: 16, color: palette.textSecondary, marginBottom: 20 }}>
              Have a question or need assistance? Fill out the form below and we&apos;ll get back to you as soon as possible.
            </AppText>

            {/* Name Fields */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">First Name *</AppText>
                <TextInput
                  style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, color: palette.textPrimary, fontFamily: 'PlayfairDisplay-Regular' }}
                  placeholder="First Name"
                  placeholderTextColor={palette.textMuted}
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">Last Name *</AppText>
                <TextInput
                  style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, color: palette.textPrimary, fontFamily: 'PlayfairDisplay-Regular' }}
                  placeholder="Last Name"
                  placeholderTextColor={palette.textMuted}
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                />
              </View>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">Email *</AppText>
              <TextInput
                style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, color: palette.textPrimary, fontFamily: 'PlayfairDisplay-Regular' }}
                placeholder="your@email.com"
                placeholderTextColor={palette.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
              />
            </View>

            {/* Phone */}
            <View style={{ marginBottom: 16 }}>
              <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">Phone *</AppText>
              <TextInput
                style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, color: palette.textPrimary, fontFamily: 'PlayfairDisplay-Regular' }}
                placeholder="+91 1234567890"
                placeholderTextColor={palette.textMuted}
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
              />
            </View>

            {/* Services */}
            <View style={{ marginBottom: 16 }}>
              <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">Services Needed *</AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {services.map((service) => (
                  <TouchableOpacity
                    key={service}
                    onPress={() => toggleService(service)}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: selectedServices.includes(service) ? palette.primary : palette.surfaceMuted,
                      borderWidth: 1,
                      borderColor: selectedServices.includes(service) ? palette.primary : palette.border,
                    }}
                  >
                    <AppText
                      style={{ color: selectedServices.includes(service) ? '#0B0F17' : palette.textPrimary, fontSize: 14, fontWeight: '500' }}
                      weight="medium"
                    >
                      {service}
                    </AppText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Message */}
            <View style={{ marginBottom: 24 }}>
              <AppText style={{ fontSize: 14, fontWeight: '600', color: palette.textPrimary, marginBottom: 8 }} weight="semibold">Message *</AppText>
              <TextInput
                style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: palette.border, color: palette.textPrimary, minHeight: 120, textAlignVertical: 'top', fontFamily: 'PlayfairDisplay-Regular' }}
                placeholder="Tell us how we can help you..."
                placeholderTextColor={palette.textMuted}
                multiline
                numberOfLines={6}
                value={formData.message}
                onChangeText={(text) => setFormData({ ...formData, message: text })}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ backgroundColor: palette.primary, borderRadius: 12, paddingVertical: 16, marginTop: 24 }}
              disabled={isSubmitting}
            >
              <AppText style={{ color: '#0B0F17', textAlign: 'center', fontSize: 18, fontWeight: 'bold' }} weight="bold">
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default ContactUsModal;

