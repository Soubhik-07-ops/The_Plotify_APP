import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getUserPropertyStatus,
  getUserRemovalRequests,
  createPropertyRemovalRequest,
  type PropertyStatus,
  type PropertyRemovalRequest,
} from '@/lib/supabase-db';
import icons from '@/constants/icons';
import { palette } from '@/constants/theme';
import { useGlobalContext } from '@/lib/global-provider';
import { LinearGradient } from 'expo-linear-gradient';
import { formatPriceINR } from '@/lib/formatters';

const { width } = Dimensions.get('window');

function PropertyStatusScreen() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [properties, setProperties] = useState<PropertyStatus[]>([]);
  const [loading, setLoading] = useState(true);
   const [removalRequests, setRemovalRequests] = useState<PropertyRemovalRequest[]>([]);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyStatus | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const fetchPropertyStatus = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const statuses = await getUserPropertyStatus(user.id);
      setProperties(statuses);
      const requests = await getUserRemovalRequests(user.id);
      setRemovalRequests(requests);
    } catch {
      console.error('Error fetching property status');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchPropertyStatus();
    }
  }, [user?.id, fetchPropertyStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return palette.primary;
      case 'rejected':
        return palette.danger;
      case 'pending':
        return '#FFA500';
      case 'needs_revision':
        return '#FFA500';
      default:
        return palette.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return icons.star;
      case 'rejected':
        return icons.info;
      case 'pending':
        return icons.calendar;
      default:
        return icons.info;
    }
  };

  const getFirstImage = (item: PropertyStatus) => {
    if (item.images && item.images.length > 0) {
      return item.images[0];
    }
    return 'https://via.placeholder.com/400x300?text=No+Image';
  };

  const getAddress = (item: PropertyStatus) => {
    const parts = [item.city, item.state, item.country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Address not specified';
  };

  const getRemovalRequestForProperty = (propertyId: number) => {
    return removalRequests.find((req) => req.property_id === propertyId) || null;
  };

  const getRemovalStatusColor = (status: PropertyRemovalRequest['request_status']) => {
    switch (status) {
      case 'approved':
        return palette.primary;
      case 'rejected':
        return palette.danger;
      case 'pending':
      default:
        return '#FFA500';
    }
  };

  const openRemovalRequestModal = (property: PropertyStatus) => {
    const existing = getRemovalRequestForProperty(property.id);
    if (existing && existing.request_status === 'pending') {
      Alert.alert(
        'Removal Request Pending',
        'You already have a pending removal request for this property.'
      );
      return;
    }
    setSelectedProperty(property);
    setRemovalReason('');
    setRequestModalVisible(true);
  };

  const handleSubmitRemovalRequest = async () => {
    if (!user?.id || !selectedProperty) return;
    if (!removalReason.trim()) {
      Alert.alert('Reason required', 'Please provide a reason for removal.');
      return;
    }

    try {
      setSubmittingRequest(true);
      const propertyId = selectedProperty.id;

      const existing = getRemovalRequestForProperty(propertyId);
      if (existing && existing.request_status === 'pending') {
        Alert.alert(
          'Removal Request Pending',
          'You already have a pending removal request for this property.'
        );
        return;
      }

      const newRequest = await createPropertyRemovalRequest({
        property_id: propertyId,
        user_id: user.id,
        property_title: selectedProperty.title,
        removal_reason: removalReason.trim(),
      });

      setRemovalRequests((prev) => [newRequest, ...prev]);
      setRequestModalVisible(false);
      setSelectedProperty(null);
      setRemovalReason('');
      Alert.alert(
        'Request Submitted',
        'Your removal request has been submitted and is pending review.'
      );
    } catch (error) {
      console.error('Error submitting removal request:', error);
      Alert.alert('Error', 'Failed to submit removal request. Please try again later.');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const renderProperty = ({ item }: { item: PropertyStatus }) => {
    const removalRequest = getRemovalRequestForProperty(item.id);
    const hasPendingRemoval = removalRequest?.request_status === 'pending';

    return (
      <View
        style={styles.cardContainer}
      >
        {/* Property Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: getFirstImage(item) }}
            style={styles.propertyImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>

          {/* Price Overlay */}
          {item.price && (
            <View style={styles.priceOverlay}>
              <Text style={styles.priceText}>{formatPriceINR(item.price)}</Text>
            </View>
          )}
        </View>

        {/* Property Details */}
        <View style={styles.cardContent}>
          <Text style={styles.propertyTitle} numberOfLines={1}>
            {item.title}
          </Text>

          {/* Location */}
          <View style={styles.locationRow}>
            <Image
              source={icons.location}
              style={styles.locationIcon}
            />
            <Text style={styles.locationText} numberOfLines={1}>
              {getAddress(item)}
            </Text>
          </View>

          {/* Status Message */}
          <View style={[styles.statusMessageContainer, {
            backgroundColor: item.status === 'approved'
              ? palette.primary + '15'
              : item.status === 'rejected'
                ? palette.danger + '15'
                : palette.surfaceMuted
          }]}>
            <View style={styles.statusIconContainer}>
              <Image
                source={getStatusIcon(item.status)}
                style={[styles.statusIcon, { tintColor: getStatusColor(item.status) }]}
              />
            </View>
            <Text style={[styles.statusMessage, { color: getStatusColor(item.status) }]}>
              {item.status_message}
            </Text>
          </View>

          {/* Rejection Details */}
          {item.rejection_reason && (
            <View style={styles.rejectionContainer}>
              <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
              {item.rejection_category && (
                <Text style={styles.rejectionCategory}>
                  Category: {item.rejection_category}
                </Text>
              )}
            </View>
          )}

          {/* Admin Notes */}
          {item.admin_notes && (
            <View style={styles.adminNotesContainer}>
              <Text style={styles.adminNotesTitle}>Admin Notes:</Text>
              <Text style={styles.adminNotesText}>{item.admin_notes}</Text>
            </View>
          )}

          {/* Removal Request Status */}
          {removalRequest && (
            <View style={styles.removalStatusContainer}>
              <Text
                style={[
                  styles.removalStatusBadge,
                  { backgroundColor: getRemovalStatusColor(removalRequest.request_status) + '20' },
                ]}
              >
                <Text style={{ fontWeight: '700', color: getRemovalStatusColor(removalRequest.request_status) }}>
                  Removal: {removalRequest.request_status.toUpperCase()}
                </Text>
              </Text>
              {removalRequest.admin_notes && (
                <Text style={styles.removalStatusNotes}>
                  {removalRequest.admin_notes}
                </Text>
              )}
            </View>
          )}

          {/* Dates */}
          <View style={styles.datesContainer}>
            <Text style={styles.dateText}>
              Submitted: {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.approved_at && (
              <Text style={styles.dateText}>
                • Approved: {new Date(item.approved_at).toLocaleDateString()}
              </Text>
            )}
            {item.rejected_at && (
              <Text style={styles.dateText}>
                • Rejected: {new Date(item.rejected_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Request Removal Action */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.removalButton,
                hasPendingRemoval && styles.removalButtonDisabled,
              ]}
              onPress={() => openRemovalRequestModal(item)}
              disabled={hasPendingRemoval}
            >
              <Text
                style={[
                  styles.removalButtonText,
                  hasPendingRemoval && styles.removalButtonTextDisabled,
                ]}
              >
                {hasPendingRemoval ? 'Removal Request Pending' : 'Request Removal'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Image source={icons.backArrow} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Properties</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProperty}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchPropertyStatus}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No properties submitted yet</Text>
              <Text style={styles.emptySubtext}>Submit a property to see its status here</Text>
            </View>
          }
        />
      )}

      {/* Removal Request Modal */}
      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (!submittingRequest) {
            setRequestModalVisible(false);
            setSelectedProperty(null);
            setRemovalReason('');
          }
        }}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            paddingHorizontal: 20,
          }}
        >
          <View
            style={{
              backgroundColor: palette.surface,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>
              Request Property Removal
            </Text>

            <Text style={{ fontSize: 14, color: palette.textMuted, marginBottom: 8 }}>
              Property
            </Text>
            <View
              style={{
                backgroundColor: palette.surfaceMuted,
                borderRadius: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: palette.border,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: palette.textPrimary }}>
                {selectedProperty?.title || '-'}
              </Text>
              {selectedProperty && (
                <Text style={{ fontSize: 13, color: palette.textSecondary, marginTop: 4 }}>
                  {getAddress(selectedProperty)}
                </Text>
              )}
            </View>

            <Text style={{ fontSize: 14, color: palette.textMuted, marginBottom: 8 }}>
              Reason for removal
            </Text>
            <TextInput
              value={removalReason}
              onChangeText={setRemovalReason}
              placeholder="Please explain why you want this property removed."
              placeholderTextColor={palette.textMuted}
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: palette.border,
                borderRadius: 12,
                padding: 12,
                backgroundColor: palette.surfaceMuted,
                color: palette.textPrimary,
                textAlignVertical: 'top',
                marginBottom: 20,
                minHeight: 100,
              }}
              editable={!submittingRequest}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  marginRight: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: palette.surfaceMuted,
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: palette.border,
                }}
                onPress={() => {
                  if (!submittingRequest) {
                    setRequestModalVisible(false);
                    setSelectedProperty(null);
                    setRemovalReason('');
                  }
                }}
                disabled={submittingRequest}
              >
                <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flex: 1,
                  marginLeft: 8,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: palette.primary,
                  alignItems: 'center',
                  opacity: submittingRequest ? 0.7 : 1,
                }}
                onPress={handleSubmitRemovalRequest}
                disabled={submittingRequest}
              >
                {submittingRequest ? (
                  <ActivityIndicator size="small" color={palette.surface} />
                ) : (
                  <Text style={{ color: palette.surface, fontWeight: '700' }}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default PropertyStatusScreen;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: palette.textPrimary,
  },
  backBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: palette.surfaceMuted,
    borderWidth: 1,
    borderColor: palette.border,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: palette.textPrimary,
  },
  listContent: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  cardContainer: {
    marginBottom: 20,
    backgroundColor: palette.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  propertyImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
  },
  statusBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  priceOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: palette.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    width: 16,
    height: 16,
    tintColor: palette.secondary,
    marginRight: 6,
  },
  locationText: {
    fontSize: 14,
    color: palette.textSecondary,
    flex: 1,
  },
  statusMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    marginRight: 10,
    marginTop: 2,
  },
  statusIcon: {
    width: 24,
    height: 24,
  },
  statusMessage: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  rejectionContainer: {
    backgroundColor: palette.danger + '10',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: palette.danger,
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.danger,
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 14,
    color: palette.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  rejectionCategory: {
    fontSize: 12,
    color: palette.textMuted,
    marginTop: 4,
  },
  adminNotesContainer: {
    backgroundColor: palette.surfaceMuted,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminNotesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: palette.textMuted,
    marginBottom: 6,
  },
  adminNotesText: {
    fontSize: 14,
    color: palette.textPrimary,
    lineHeight: 20,
  },
  datesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  dateText: {
    fontSize: 12,
    color: palette.textMuted,
    marginRight: 8,
  },
  actionsContainer: {
    marginTop: 12,
  },
  removalButton: {
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary + '10',
  },
  removalButtonDisabled: {
    backgroundColor: palette.surfaceMuted,
    borderColor: palette.border,
  },
  removalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: palette.primary,
  },
  removalButtonTextDisabled: {
    color: palette.textMuted,
  },
  removalStatusContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  removalStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
    fontSize: 11,
  },
  removalStatusNotes: {
    marginTop: 4,
    fontSize: 12,
    color: palette.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: palette.textMuted,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: palette.textSecondary,
    fontSize: 14,
  },
});

