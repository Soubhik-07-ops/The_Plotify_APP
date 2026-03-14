import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  FlatList,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGlobalContext } from '@/lib/global-provider';
import { Property } from '@/lib/supabase-db';
import icons from '@/constants/icons';
import { palette } from '@/constants/theme';

interface PropertySharingProps {
  visible: boolean;
  onClose: () => void;
  property?: Property;
}

interface SharedProperty {
  id: string;
  property: Property;
  sharedBy: {
    name: string;
    avatar: string;
    email: string;
  };
  sharedWith: {
    name: string;
    avatar: string;
    email: string;
  };
  message?: string;
  createdAt: Date;
  status: 'pending' | 'viewed' | 'interested' | 'not-interested';
}

interface CollaborationGroup {
  id: string;
  name: string;
  members: {
    name: string;
    avatar: string;
    email: string;
    role: 'owner' | 'member';
  }[];
  properties: Property[];
  budget: {
    min: number;
    max: number;
  };
  preferences: {
    neighborhoods: string[];
    propertyTypes: string[];
    bedrooms: number;
  };
  createdAt: Date;
}

const PropertySharing = ({ visible, onClose, property }: PropertySharingProps) => {
  const { user } = useGlobalContext();
  const [activeTab, setActiveTab] = useState<'share' | 'collaborate' | 'groups'>('share');
  const [showCollaborationModal, setShowCollaborationModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    budget: { min: 300000, max: 600000 },
    neighborhoods: [] as string[],
    propertyTypes: [] as string[],
    bedrooms: 3,
  });

  // Removed demo data - using real Share API instead

  // Removed demoCollaborationGroups - will be loaded from Supabase when implemented

  const neighborhoods = ['Downtown', 'Westside', 'Midtown', 'Eastside', 'Northside'];
  const propertyTypes = ['Apartment', 'House', 'Condos', 'Townhouse', 'Villa'];

  const handleShareProperty = async () => {
    if (!property) {
      Alert.alert('Error', 'No property to share');
      return;
    }

    try {
      const shareMessage = `Check out this property: ${property.name}\n\n${property.address}\nPrice: ${property.price}\n\nI thought you might be interested in this property!`;

      const result = await Share.share({
        message: shareMessage,
        title: property.name,
      });

      if (result.action === Share.sharedAction) {
        Alert.alert('Success', 'Property shared successfully!');
      }
    } catch (error) {
      console.error('Error sharing property:', error);
      Alert.alert('Error', 'Failed to share property. Please try again.');
    }
  };

  const handleCreateCollaboration = async () => {
    if (!newGroup.name.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    // TODO: Implement collaboration groups table in Supabase
    // For now, show info message
    Alert.alert('Info', 'Collaboration groups feature coming soon! This will allow you to create buying groups with friends and family.');
    setNewGroup({ name: '', budget: { min: 300000, max: 600000 }, neighborhoods: [], propertyTypes: [], bedrooms: 3 });
    setShowCollaborationModal(false);
  };


  const toggleNeighborhood = (neighborhood: string) => {
    if (newGroup.neighborhoods.includes(neighborhood)) {
      setNewGroup({
        ...newGroup,
        neighborhoods: newGroup.neighborhoods.filter(n => n !== neighborhood)
      });
    } else {
      setNewGroup({
        ...newGroup,
        neighborhoods: [...newGroup.neighborhoods, neighborhood]
      });
    }
  };

  const togglePropertyType = (type: string) => {
    if (newGroup.propertyTypes.includes(type)) {
      setNewGroup({
        ...newGroup,
        propertyTypes: newGroup.propertyTypes.filter(t => t !== type)
      });
    } else {
      setNewGroup({
        ...newGroup,
        propertyTypes: [...newGroup.propertyTypes, type]
      });
    }
  };

  const renderShareTab = () => (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <View style={{ gap: 24 }}>
        {/* Share Property Section */}
        {property && (
          <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Share This Property</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Image source={{ uri: property.image }} style={{ width: 64, height: 64, borderRadius: 12, marginRight: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '500', color: palette.textPrimary }}>{property.name}</Text>
                <Text style={{ color: palette.textSecondary }}>{property.address}</Text>
                <Text style={{ color: palette.primary, fontWeight: '500' }}>{property.price}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={async () => {
                if (!property) return;
                try {
                  const shareMessage = `Check out this property: ${property.name}\n\n${property.address}\nPrice: ${property.price}\n\nI thought you might be interested in this property!`;

                  const result = await Share.share({
                    message: shareMessage,
                    title: property.name,
                  });

                  if (result.action === Share.sharedAction) {
                    Alert.alert('Success', 'Property shared successfully!');
                  }
                } catch (error) {
                  console.error('Error sharing property:', error);
                  Alert.alert('Error', 'Failed to share property. Please try again.');
                }
              }}
              style={{ backgroundColor: palette.primary, paddingVertical: 12, borderRadius: 12 }}
            >
              <Text style={{ color: '#0B0F17', fontWeight: '500', textAlign: 'center' }}>Share Property</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shared Properties - Removed dummy data */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Shared Properties</Text>
          <View style={{ gap: 12 }}>
            {/* Real shared properties would be loaded from Supabase here */}
            <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: palette.border, alignItems: 'center' }}>
              <Text style={{ color: palette.textMuted, textAlign: 'center' }}>No shared properties yet</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderCollaborateTab = () => (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: palette.background }}>
      <View style={{ gap: 24 }}>
        {/* Create Collaboration */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Create Collaboration</Text>
          <Text style={{ color: palette.textSecondary, marginBottom: 16 }}>
            Start a collaborative property hunt with friends, family, or partners
          </Text>
          <TouchableOpacity
            onPress={() => setShowCollaborationModal(true)}
            style={{ backgroundColor: palette.primary, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#0B0F17', fontWeight: '500', textAlign: 'center' }}>Create New Group</Text>
          </TouchableOpacity>
        </View>

        {/* Your Collaborations - Removed dummy data */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Your Collaborations</Text>
          <View style={{ gap: 12 }}>
            {/* Real collaboration groups would be loaded from Supabase here */}
            <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: palette.border, alignItems: 'center' }}>
              <Text style={{ color: palette.textMuted, textAlign: 'center' }}>No collaboration groups yet</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderGroupsTab = () => (
    <ScrollView style={{ flex: 1, padding: 16, backgroundColor: palette.background }}>
      <View style={{ gap: 24 }}>
        {/* Group Buying Opportunities */}
        <View style={{
          backgroundColor: palette.surfaceElevated,
          borderRadius: 12,
          padding: 16,
          borderWidth: 1,
          borderColor: palette.border,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 8 }}>Group Buying Opportunities</Text>
          <Text style={{ color: palette.textSecondary }}>
            Join forces with other buyers to get better deals and more options
          </Text>
        </View>

        {/* Available Groups - Removed dummy data */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Available Groups</Text>
          <View style={{ gap: 12 }}>
            {/* Real groups would be loaded from Supabase here */}
            <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: palette.border, alignItems: 'center' }}>
              <Text style={{ color: palette.textMuted, textAlign: 'center' }}>No groups available yet</Text>
            </View>
          </View>
        </View>

        {/* Benefits */}
        <View style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: palette.border }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>Benefits of Group Buying</Text>
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, color: palette.textSecondary }}>• Better negotiating power with sellers</Text>
            <Text style={{ fontSize: 14, color: palette.textSecondary }}>• Access to exclusive properties</Text>
            <Text style={{ fontSize: 14, color: palette.textSecondary }}>• Shared costs for inspections and legal fees</Text>
            <Text style={{ fontSize: 14, color: palette.textSecondary }}>• Pooled resources for larger investments</Text>
            <Text style={{ fontSize: 14, color: palette.textSecondary }}>• Collective expertise and insights</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
          {/* Header */}
          <LinearGradient colors={[palette.primary, palette.secondary]} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: palette.border, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: palette.textPrimary, fontWeight: '500' }}>✕</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0B0F17' }}>Share & Collaborate</Text>
            <View style={{ width: 24 }} />
          </LinearGradient>

          {/* Tab Navigation */}
          <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.border, backgroundColor: palette.surface }}>
            {[
              { id: 'share', label: 'Share', icon: '📤' },
              { id: 'collaborate', label: 'Collaborate', icon: '🤝' },
              { id: 'groups', label: 'Group Buy', icon: '👥' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderBottomWidth: activeTab === tab.id ? 2 : 0,
                  borderBottomColor: palette.primary,
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  fontWeight: '500',
                  color: activeTab === tab.id ? palette.primary : palette.textMuted,
                }}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'share' && renderShareTab()}
          {activeTab === 'collaborate' && renderCollaborateTab()}
          {activeTab === 'groups' && renderGroupsTab()}
        </SafeAreaView>
      </Modal>


      {/* Create Collaboration Modal */}
      <Modal
        visible={showCollaborationModal}
        animationType="slide"
        transparent={true}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.overlay }}>
          <ScrollView style={{ backgroundColor: palette.surfaceMuted, borderRadius: 12, padding: 24, width: '92%', maxHeight: '96%', borderWidth: 1, borderColor: palette.border }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 16 }}>Create Collaboration</Text>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Group Name</Text>
              <TextInput
                value={newGroup.name}
                onChangeText={(text) => setNewGroup({ ...newGroup, name: text })}
                placeholder="e.g., Downtown Dream Team"
                style={{ borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surface }}
              />
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Budget Range</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={newGroup.budget.min.toString()}
                  onChangeText={(text) => setNewGroup({
                    ...newGroup,
                    budget: { ...newGroup.budget, min: parseInt(text) || 0 }
                  })}
                  placeholder="Min"
                  keyboardType="numeric"
                  style={{ flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surface }}
                />
                <TextInput
                  value={newGroup.budget.max.toString()}
                  onChangeText={(text) => setNewGroup({
                    ...newGroup,
                    budget: { ...newGroup.budget, max: parseInt(text) || 0 }
                  })}
                  placeholder="Max"
                  keyboardType="numeric"
                  style={{ flex: 1, borderWidth: 1, borderColor: palette.border, borderRadius: 12, padding: 12, fontSize: 16, color: palette.textPrimary, backgroundColor: palette.surface }}
                />
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Preferred Neighborhoods</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {neighborhoods.map((neighborhood) => (
                    <TouchableOpacity
                      key={neighborhood}
                      onPress={() => toggleNeighborhood(neighborhood)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: newGroup.neighborhoods.includes(neighborhood) ? palette.primary : palette.border,
                        backgroundColor: newGroup.neighborhoods.includes(neighborhood) ? palette.primarySoft : palette.surfaceMuted,
                      }}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: newGroup.neighborhoods.includes(neighborhood) ? palette.primary : palette.textMuted,
                      }}>
                        {neighborhood}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Property Types</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {propertyTypes.map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => togglePropertyType(type)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: newGroup.propertyTypes.includes(type) ? palette.primary : palette.border,
                        backgroundColor: newGroup.propertyTypes.includes(type) ? palette.primarySoft : palette.surfaceMuted,
                      }}
                    >
                      <Text style={{
                        fontSize: 14,
                        color: newGroup.propertyTypes.includes(type) ? palette.primary : palette.textMuted,
                      }}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 24 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>Minimum Bedrooms</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((bedrooms) => (
                  <TouchableOpacity
                    key={bedrooms}
                    onPress={() => setNewGroup({ ...newGroup, bedrooms })}
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      borderWidth: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderColor: newGroup.bedrooms === bedrooms ? palette.primary : palette.border,
                      backgroundColor: newGroup.bedrooms === bedrooms ? palette.primarySoft : palette.surfaceMuted,
                    }}
                  >
                    <Text style={{
                      fontWeight: '500',
                      color: newGroup.bedrooms === bedrooms ? palette.primary : palette.textMuted,
                    }}>
                      {bedrooms}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowCollaborationModal(false)}
                style={{ flex: 1, backgroundColor: palette.surface, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: palette.border }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: palette.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateCollaboration}
                style={{ flex: 1, backgroundColor: palette.primary, paddingVertical: 12, borderRadius: 12 }}
              >
                <Text style={{ textAlign: 'center', fontWeight: '500', color: '#0B0F17' }}>Create</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

export default PropertySharing; 