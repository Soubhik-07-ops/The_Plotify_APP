/**
 * Admin Dashboard
 * 
 * Main admin panel with tab navigation matching website functionality.
 * Mobile-optimized UI with brown/beige theme.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, Image, Alert, Modal, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { palette } from '@/constants/theme';
import icons from '@/constants/icons';
import { supabase } from '@/lib/supabase';
import { useGlobalContext } from '@/lib/global-provider';
import {
    getPublishedHomes,
    getArchivedHomes,
    getPendingHomes,
    getUsers,
    getSubscriptions,
    getContacts,
    getRemovalRequests,
    approvePendingHome,
    rejectPendingHome,
    archiveHome,
    unarchiveHome,
    deleteHome,
    approveRemovalRequest,
    rejectRemovalRequest,
    deleteUser,
    type Home,
    type PendingHome,
    type UserProfile,
    type Subscription,
    type Contact,
    type RemovalRequest,
} from '@/lib/services/adminService';
import {
    getAllAnnouncements,
    createAnnouncement,
    updateAnnouncementStatus,
    deleteAnnouncement,
    type Announcement,
} from '@/lib/announcements';

type TabType = 'homes' | 'pending' | 'archived' | 'users' | 'subscriptions' | 'contacts' | 'removals' | 'announcements';

export default function AdminDashboard() {
    const router = useRouter();
    const { user } = useGlobalContext();
    const [activeTab, setActiveTab] = useState<TabType>('homes');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data states
    const [homes, setHomes] = useState<Home[]>([]);
    const [archivedHomes, setArchivedHomes] = useState<Home[]>([]);
    const [pendingHomes, setPendingHomes] = useState<PendingHome[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [removalRequests, setRemovalRequests] = useState<RemovalRequest[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    // Filter states
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('all');

    // Modal states
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [currentRejectHome, setCurrentRejectHome] = useState<{ id: number; title: string } | null>(null);
    const [showApprovalModal, setShowApprovalModal] = useState(false);
    const [currentApproveHome, setCurrentApproveHome] = useState<{ id: number; title: string } | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [currentImages, setCurrentImages] = useState<string[]>([]);
    const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
    const [announcementTitle, setAnnouncementTitle] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementLink, setAnnouncementLink] = useState('');
    const [announcementPriority, setAnnouncementPriority] = useState('0');
    const [announcementExpiresAt, setAnnouncementExpiresAt] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(new Date());

    // Fetch all data function (reusable for initial load and refresh)
    const fetchAllData = useCallback(async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            // Fetch all data in parallel for better performance
            const [homesData, archivedData, pendingData, usersData, subscriptionsData, contactsData, removalsData, announcementsData] = await Promise.all([
                getPublishedHomes(searchQuery),
                getArchivedHomes(searchQuery),
                getPendingHomes(searchQuery),
                getUsers(searchQuery),
                getSubscriptions(searchQuery, statusFilter, dateRange),
                getContacts(searchQuery),
                getRemovalRequests(searchQuery),
                getAllAnnouncements(searchQuery),
            ]);

            setHomes(homesData);
            setArchivedHomes(archivedData);
            setPendingHomes(pendingData);
            setUsers(usersData);
            setSubscriptions(subscriptionsData);
            setContacts(contactsData);
            setRemovalRequests(removalsData);
            setAnnouncements(announcementsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            Alert.alert('Error', 'Failed to load data');
        } finally {
            if (isRefresh) {
                setRefreshing(false);
            } else {
                setLoading(false);
            }
        }
    }, [searchQuery, statusFilter, dateRange]);

    // Fetch all data on initial load and when search/filters change
    useEffect(() => {
        fetchAllData(false);
    }, [fetchAllData]);

    // Handle pull-to-refresh
    const onRefresh = useCallback(() => {
        fetchAllData(true);
    }, [fetchAllData]);

    // Format date
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    // Format expiry date for display (e.g. "Feb 1, 2026 • 10:30 AM")
    const formatExpiryDate = (date: Date | null): string => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }) + ' • ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    // Handle date picker change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (event.type === 'set' && selectedDate) {
            setTempDate(selectedDate);
            if (Platform.OS === 'android') {
                // On Android, show time picker immediately after date
                setShowTimePicker(true);
            } else {
                // On iOS, show time picker after date picker closes
                setTimeout(() => setShowTimePicker(true), 300);
            }
        } else if (event.type === 'dismissed') {
            setShowDatePicker(false);
        }
    };

    // Handle time picker change
    const handleTimeChange = (event: any, selectedTime?: Date) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        if (event.type === 'set' && selectedTime) {
            // Combine date and time
            const combined = new Date(tempDate);
            combined.setHours(selectedTime.getHours());
            combined.setMinutes(selectedTime.getMinutes());
            combined.setSeconds(0);
            combined.setMilliseconds(0);
            setAnnouncementExpiresAt(combined);
        }
        setShowTimePicker(false);
        setShowDatePicker(false);
    };

    // Clear expiry date
    const handleClearExpiry = () => {
        setAnnouncementExpiresAt(null);
    };

    // Format currency
    const formatCurrency = (amount: number | string | null | undefined) => {
        if (!amount || amount === 'NaN' || amount === null || amount === undefined) {
            return 'Price not available';
        }

        if (typeof amount === 'string') {
            if (amount.includes('₹') || amount.includes('L') || amount.includes('Cr')) {
                return amount;
            }
            const numericAmount = parseFloat(amount);
            if (!isNaN(numericAmount) && numericAmount > 0) {
                if (numericAmount >= 10000000) {
                    return `₹${(numericAmount / 10000000).toFixed(1)}Cr`;
                } else if (numericAmount >= 100000) {
                    return `₹${(numericAmount / 100000).toFixed(1)}L`;
                } else {
                    return `₹${(numericAmount / 1000).toFixed(0)}K`;
                }
            }
        }

        if (typeof amount === 'number' && amount > 0) {
            if (amount >= 10000000) {
                return `₹${(amount / 10000000).toFixed(1)}Cr`;
            } else if (amount >= 100000) {
                return `₹${(amount / 100000).toFixed(1)}L`;
            } else {
                return `₹${(amount / 1000).toFixed(0)}K`;
            }
        }

        return 'Price not available';
    };

    // Handle approve pending home
    const handleApproveHome = async (homeId: number, homeTitle: string) => {
        setCurrentApproveHome({ id: homeId, title: homeTitle });
        setShowApprovalModal(true);
    };

    const confirmApproval = async () => {
        if (!currentApproveHome) return;

        try {
            setLoading(true);
            await approvePendingHome(currentApproveHome.id, user?.id);
            Alert.alert('Success', 'Property approved and published successfully!');
            setShowApprovalModal(false);
            setCurrentApproveHome(null);

            // Refresh data
            const pendingData = await getPendingHomes(searchQuery);
            setPendingHomes(pendingData);
            const homesData = await getPublishedHomes(searchQuery);
            setHomes(homesData);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to approve property');
        } finally {
            setLoading(false);
        }
    };

    // Handle reject pending home
    const handleRejectHome = async (homeId: number, homeTitle: string) => {
        setCurrentRejectHome({ id: homeId, title: homeTitle });
        setShowRejectionModal(true);
    };

    const confirmRejection = async () => {
        if (!currentRejectHome) return;

        try {
            setLoading(true);
            await rejectPendingHome(currentRejectHome.id, rejectionReason || 'No reason provided', user?.id);
            Alert.alert('Success', 'Property rejected successfully');
            setShowRejectionModal(false);
            setRejectionReason('');
            setCurrentRejectHome(null);

            // Refresh data
            const pendingData = await getPendingHomes(searchQuery);
            setPendingHomes(pendingData);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to reject property');
        } finally {
            setLoading(false);
        }
    };

    // Handle archive home
    const handleArchiveHome = async (homeId: number, homeTitle: string) => {
        Alert.alert(
            'Archive Property',
            `Are you sure you want to archive "${homeTitle}"? This will hide it from published homes but not delete it.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Archive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await archiveHome(homeId);
                            Alert.alert('Success', 'Property archived successfully!');

                            // Refresh data
                            const homesData = await getPublishedHomes(searchQuery);
                            setHomes(homesData);
                            const archivedData = await getArchivedHomes(searchQuery);
                            setArchivedHomes(archivedData);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to archive property');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle unarchive home
    const handleUnarchiveHome = async (homeId: number) => {
        try {
            setLoading(true);
            await unarchiveHome(homeId);
            Alert.alert('Success', 'Property unarchived successfully!');

            // Refresh data
            const homesData = await getPublishedHomes(searchQuery);
            setHomes(homesData);
            const archivedData = await getArchivedHomes(searchQuery);
            setArchivedHomes(archivedData);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to unarchive property');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete home
    const handleDeleteHome = async (homeId: number, homeTitle: string) => {
        Alert.alert(
            'Delete Property',
            `Are you sure you want to delete "${homeTitle}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteHome(homeId);
                            Alert.alert('Success', 'Property deleted successfully!');

                            // Refresh data
                            const homesData = await getPublishedHomes(searchQuery);
                            setHomes(homesData);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete property');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle approve removal request
    const handleApproveRemoval = async (requestId: number, propertyId: number) => {
        Alert.alert(
            'Approve Removal',
            'Are you sure you want to approve this removal request? The property will be deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await approveRemovalRequest(requestId, propertyId);
                            Alert.alert('Success', 'Removal request approved! Property has been deleted.');

                            // Refresh data
                            const removalsData = await getRemovalRequests(searchQuery);
                            setRemovalRequests(removalsData);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to approve removal request');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle reject removal request
    const handleRejectRemoval = async (requestId: number) => {
        Alert.alert(
            'Reject Removal',
            'Are you sure you want to reject this removal request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await rejectRemovalRequest(requestId);
                            Alert.alert('Success', 'Removal request rejected successfully!');

                            // Refresh data
                            const removalsData = await getRemovalRequests(searchQuery);
                            setRemovalRequests(removalsData);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to reject removal request');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // Handle delete user
    const handleDeleteUser = async (userId: string, userEmail: string) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteUser(userId);
                            Alert.alert('Success', 'User deleted successfully!');

                            // Refresh data
                            const usersData = await getUsers(searchQuery);
                            setUsers(usersData);
                        } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to delete user');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    // View images
    const handleViewImages = (images: { url: string }[]) => {
        setCurrentImages(images.map(img => img.url));
        setShowImageModal(true);
    };

    // Get status badge color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
            case 'approved':
                return palette.primary;
            case 'pending':
                return '#D97757';
            case 'rejected':
            case 'canceled':
                return palette.danger;
            default:
                return palette.textMuted;
        }
    };

    // Render compact pill tab button
    const renderTabButton = useCallback((tab: TabType, label: string, count?: number) => {
        const isActive = activeTab === tab;
        return (
            <TouchableOpacity
                onPress={() => setActiveTab(tab)}
                style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    backgroundColor: isActive ? palette.primary : palette.surfaceMuted,
                    marginRight: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: isActive ? 0 : 1,
                    borderColor: palette.border,
                    shadowColor: isActive ? palette.primary : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isActive ? 0.2 : 0,
                    shadowRadius: 4,
                    elevation: isActive ? 3 : 0,
                }}
                activeOpacity={0.7}
            >
                <Text
                    style={{
                        color: isActive ? palette.surface : palette.textPrimary,
                        fontWeight: isActive ? '700' : '500',
                        fontSize: 13,
                        letterSpacing: 0.2,
                    }}
                >
                    {label}
                </Text>
                {count !== undefined && (
                    <View
                        style={{
                            marginLeft: 6,
                            backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : palette.primary,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 10,
                            minWidth: 20,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Text
                            style={{
                                color: isActive ? palette.surface : palette.surface,
                                fontSize: 10,
                                fontWeight: '700',
                            }}
                        >
                            {count}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    }, [activeTab]);

    // Get current data based on active tab
    const currentData = useMemo(() => {
        switch (activeTab) {
            case 'homes': return homes;
            case 'pending': return pendingHomes;
            case 'archived': return archivedHomes;
            case 'users': return users;
            case 'subscriptions': return subscriptions;
            case 'contacts': return contacts;
            case 'removals': return removalRequests;
            case 'announcements': return announcements;
            default: return [];
        }
    }, [activeTab, homes, pendingHomes, archivedHomes, users, subscriptions, contacts, removalRequests, announcements]);

    // Get count text
    const countText = useMemo(() => {
        if (loading) return '';
        const count = currentData.length;
        switch (activeTab) {
            case 'homes': return `Found ${count} ${count === 1 ? 'Property' : 'Properties'}`;
            case 'pending': return `Found ${count} ${count === 1 ? 'Property' : 'Properties'}`;
            case 'archived': return `Found ${count} ${count === 1 ? 'Property' : 'Properties'}`;
            case 'users': return `Found ${count} ${count === 1 ? 'User' : 'Users'}`;
            case 'subscriptions': return `Found ${count} ${count === 1 ? 'Subscription' : 'Subscriptions'}`;
            case 'contacts': return `Found ${count} ${count === 1 ? 'Contact' : 'Contacts'}`;
            case 'removals': return `Found ${count} ${count === 1 ? 'Request' : 'Requests'}`;
            case 'announcements': return `Found ${count} ${count === 1 ? 'Announcement' : 'Announcements'}`;
            default: return '';
        }
    }, [activeTab, currentData.length, loading]);

    // Render item for FlatList
    const renderItem = useCallback(({ item }: { item: any }) => {
        switch (activeTab) {
            case 'homes':
                return (
                    <HomeCard
                        home={item}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        onArchive={() => handleArchiveHome(item.id, item.title || 'Untitled')}
                        onDelete={() => handleDeleteHome(item.id, item.title || 'Untitled')}
                    />
                );
            case 'pending':
                return (
                    <PendingHomeCard
                        home={item}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        getStatusColor={getStatusColor}
                        onApprove={() => handleApproveHome(item.id, item.title || 'Untitled')}
                        onReject={() => handleRejectHome(item.id, item.title || 'Untitled')}
                        onViewImages={() => handleViewImages(item.images || [])}
                    />
                );
            case 'archived':
                return (
                    <ArchivedHomeCard
                        home={item}
                        formatDate={formatDate}
                        formatCurrency={formatCurrency}
                        onUnarchive={() => handleUnarchiveHome(item.id)}
                    />
                );
            case 'users':
                return (
                    <UserCard
                        user={item}
                        formatDate={formatDate}
                        onDelete={() => handleDeleteUser(item.id, item.email)}
                    />
                );
            case 'subscriptions':
                return (
                    <SubscriptionCard
                        subscription={item}
                        formatDate={formatDate}
                        getStatusColor={getStatusColor}
                    />
                );
            case 'contacts':
                return <ContactCard contact={item} formatDate={formatDate} />;
            case 'removals':
                return (
                    <RemovalRequestCard
                        request={item}
                        formatDate={formatDate}
                        getStatusColor={getStatusColor}
                        onApprove={() => handleApproveRemoval(item.id, item.property_id)}
                        onReject={() => handleRejectRemoval(item.id)}
                    />
                );
            case 'announcements':
                return (
                    <AnnouncementCard
                        announcement={item}
                        formatDate={formatDate}
                        onToggleActive={async () => {
                            try {
                                setLoading(true);
                                await updateAnnouncementStatus(item.id, !item.is_active);
                                const updated = await getAllAnnouncements(searchQuery);
                                setAnnouncements(updated);
                            } catch (error: any) {
                                Alert.alert('Error', error.message || 'Failed to update announcement');
                            } finally {
                                setLoading(false);
                            }
                        }}
                        onDelete={async () => {
                            Alert.alert(
                                'Delete Announcement',
                                'Are you sure you want to delete this announcement?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Delete',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                setLoading(true);
                                                await deleteAnnouncement(item.id);
                                                const updated = await getAllAnnouncements(searchQuery);
                                                setAnnouncements(updated);
                                            } catch (error: any) {
                                                Alert.alert('Error', error.message || 'Failed to delete announcement');
                                            } finally {
                                                setLoading(false);
                                            }
                                        },
                                    },
                                ]
                            );
                        }}
                    />
                );
            default:
                return null;
        }
    }, [activeTab, formatDate, formatCurrency, getStatusColor, handleArchiveHome, handleDeleteHome, handleApproveHome, handleRejectHome, handleViewImages, handleUnarchiveHome, handleDeleteUser, handleApproveRemoval, handleRejectRemoval, searchQuery]);

    // Key extractor for FlatList
    const keyExtractor = useCallback((item: any) => {
        return String(item.id || Math.random());
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
            {/* Sticky Header */}
            <View style={{ backgroundColor: palette.surface, borderBottomWidth: 1, borderBottomColor: palette.border, zIndex: 10 }}>
                {/* Header */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingHorizontal: 20,
                        paddingVertical: 14,
                    }}
                >
                    <TouchableOpacity
                        onPress={() => router.replace("/(root)/(tabs)" as any)}
                        style={{
                            padding: 8,
                            borderRadius: 20,
                            backgroundColor: palette.surfaceMuted,
                            borderWidth: 1,
                            borderColor: palette.border,
                        }}
                    >
                        <Image source={icons.backArrow} style={{ width: 20, height: 20, tintColor: palette.textPrimary }} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: palette.textPrimary, letterSpacing: 0.3 }}>
                        Admin Dashboard
                    </Text>
                    <View style={{ width: 36 }} />
                </View>

                {/* Compact Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                    {renderTabButton('homes', 'Homes', homes.length)}
                    {renderTabButton('pending', 'Pending', pendingHomes.filter(h => h.status === 'pending').length)}
                    {renderTabButton('archived', 'Archived', archivedHomes.length)}
                    {renderTabButton('users', 'Users', users.length)}
                    {renderTabButton('subscriptions', 'Subscriptions', subscriptions.length)}
                    {renderTabButton('contacts', 'Contacts', contacts.length)}
                    {renderTabButton('removals', 'Removals', removalRequests.length)}
                    {renderTabButton('announcements', 'Announcements', announcements.length)}
                </ScrollView>

                {/* Search Bar */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: palette.surfaceMuted,
                            borderRadius: 12,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderWidth: 1,
                            borderColor: palette.border,
                        }}
                    >
                        <Image source={icons.search} style={{ width: 18, height: 18, tintColor: palette.textMuted, marginRight: 10 }} />
                        <TextInput
                            placeholder={`Search ${activeTab}...`}
                            placeholderTextColor={palette.textMuted}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{ flex: 1, color: palette.textPrimary, fontSize: 15 }}
                        />
                    </View>
                </View>

                {/* Results Count + New Announcement button */}
                {!loading && countText && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: palette.textPrimary }}>
                            {countText}
                        </Text>
                        {activeTab === 'announcements' && (
                            <TouchableOpacity
                                onPress={() => {
                                    setAnnouncementTitle('');
                                    setAnnouncementMessage('');
                                    setAnnouncementLink('');
                                    setAnnouncementPriority('0');
                                    setAnnouncementExpiresAt(null);
                                    setTempDate(new Date());
                                    setShowAnnouncementModal(true);
                                }}
                                style={{
                                    paddingVertical: 6,
                                    paddingHorizontal: 12,
                                    borderRadius: 999,
                                    backgroundColor: palette.primary,
                                }}
                            >
                                <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 13 }}>
                                    New Announcement
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {/* Content with FlatList */}
            <View style={{ flex: 1 }}>
                {loading ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={palette.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={currentData}
                        renderItem={renderItem}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={{ padding: 16, paddingTop: 12 }}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
                                <Text style={{ fontSize: 16, color: palette.textMuted, textAlign: 'center', marginBottom: 8 }}>
                                    No {activeTab} found
                                </Text>
                                <Text style={{ fontSize: 14, color: palette.textSecondary, textAlign: 'center' }}>
                                    {searchQuery ? 'Try adjusting your search' : 'Data will appear here when available'}
                                </Text>
                            </View>
                        }
                    />
                )}
            </View>

            {/* Approval Modal */}
            <Modal visible={showApprovalModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: palette.surface, borderRadius: 20, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>
                            Approve Property
                        </Text>
                        <Text style={{ color: palette.textSecondary, marginBottom: 24 }}>
                            Are you sure you want to approve "{currentApproveHome?.title}"? This will publish it to the public site.
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowApprovalModal(false);
                                    setCurrentApproveHome(null);
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.surfaceMuted,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={confirmApproval}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.primary,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.surface, fontWeight: 'bold' }}>Approve</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Rejection Modal */}
            <Modal visible={showRejectionModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: palette.surface, borderRadius: 20, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>
                            Reject Property
                        </Text>
                        <Text style={{ color: palette.textSecondary, marginBottom: 16 }}>
                            Are you sure you want to reject "{currentRejectHome?.title}"?
                        </Text>
                        <TextInput
                            placeholder="Reason for rejection (optional)"
                            placeholderTextColor={palette.textMuted}
                            value={rejectionReason}
                            onChangeText={setRejectionReason}
                            multiline
                            numberOfLines={4}
                            style={{
                                backgroundColor: palette.surfaceMuted,
                                borderRadius: 12,
                                padding: 12,
                                borderWidth: 1,
                                borderColor: palette.border,
                                color: palette.textPrimary,
                                marginBottom: 20,
                                textAlignVertical: 'top',
                            }}
                        />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setShowRejectionModal(false);
                                    setRejectionReason('');
                                    setCurrentRejectHome(null);
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.surfaceMuted,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={confirmRejection}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.danger,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.surface, fontWeight: 'bold' }}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Image Modal */}
            <Modal visible={showImageModal} transparent animationType="fade">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 }}>
                    <TouchableOpacity
                        onPress={() => setShowImageModal(false)}
                        style={{ position: 'absolute', top: 40, right: 20, zIndex: 1 }}
                    >
                        <Text style={{ color: palette.surface, fontSize: 24, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {currentImages.map((imageUrl, index) => (
                            <Image
                                key={index}
                                source={{ uri: imageUrl }}
                                style={{ width: 350, height: 400, marginRight: 10, borderRadius: 12 }}
                                resizeMode="contain"
                            />
                        ))}
                    </ScrollView>
                </View>
            </Modal>

            {/* Announcement Modal */}
            <Modal visible={showAnnouncementModal} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
                    <View style={{ backgroundColor: palette.surface, borderRadius: 20, padding: 24 }}>
                        <Text style={{ fontSize: 20, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>
                            New Announcement
                        </Text>
                        <TextInput
                            placeholder="Title"
                            placeholderTextColor={palette.textMuted}
                            value={announcementTitle}
                            onChangeText={setAnnouncementTitle}
                            style={{
                                backgroundColor: palette.surfaceMuted,
                                borderRadius: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: palette.border,
                                color: palette.textPrimary,
                                marginBottom: 10,
                            }}
                        />
                        <TextInput
                            placeholder="Message"
                            placeholderTextColor={palette.textMuted}
                            value={announcementMessage}
                            onChangeText={setAnnouncementMessage}
                            multiline
                            numberOfLines={4}
                            style={{
                                backgroundColor: palette.surfaceMuted,
                                borderRadius: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: palette.border,
                                color: palette.textPrimary,
                                marginBottom: 10,
                                textAlignVertical: 'top',
                            }}
                        />
                        <TextInput
                            placeholder="Optional link (https://...)"
                            placeholderTextColor={palette.textMuted}
                            value={announcementLink}
                            onChangeText={setAnnouncementLink}
                            style={{
                                backgroundColor: palette.surfaceMuted,
                                borderRadius: 10,
                                padding: 10,
                                borderWidth: 1,
                                borderColor: palette.border,
                                color: palette.textPrimary,
                                marginBottom: 10,
                            }}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 12, color: palette.textSecondary, marginBottom: 4 }}>Priority (higher shows first)</Text>
                                <TextInput
                                    placeholder="0"
                                    placeholderTextColor={palette.textMuted}
                                    value={announcementPriority}
                                    onChangeText={setAnnouncementPriority}
                                    keyboardType="numeric"
                                    style={{
                                        backgroundColor: palette.surfaceMuted,
                                        borderRadius: 10,
                                        padding: 10,
                                        borderWidth: 1,
                                        borderColor: palette.border,
                                        color: palette.textPrimary,
                                    }}
                                />
                            </View>
                        </View>
                        <Text style={{ fontSize: 12, color: palette.textSecondary, marginBottom: 4 }}>
                            Optional expiry
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => {
                                    setTempDate(announcementExpiresAt || new Date());
                                    setShowDatePicker(true);
                                }}
                                activeOpacity={0.7}
                                style={{
                                    flex: 1,
                                    backgroundColor: palette.surfaceMuted,
                                    borderRadius: 10,
                                    padding: 12,
                                    borderWidth: 1,
                                    borderColor: palette.border,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <Text
                                    style={{
                                        color: announcementExpiresAt ? palette.textPrimary : palette.textMuted,
                                        fontSize: 14,
                                        flex: 1,
                                    }}
                                >
                                    {announcementExpiresAt ? formatExpiryDate(announcementExpiresAt) : 'Expires at (optional)'}
                                </Text>
                                <Text style={{ color: palette.textMuted, fontSize: 16 }}>📅</Text>
                            </TouchableOpacity>
                            {announcementExpiresAt && (
                                <TouchableOpacity
                                    onPress={handleClearExpiry}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 12,
                                        backgroundColor: palette.surfaceMuted,
                                        borderRadius: 10,
                                        borderWidth: 1,
                                        borderColor: palette.border,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Text style={{ color: palette.danger, fontSize: 14, fontWeight: '600' }}>Clear</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {/* Date Picker Modal */}
                        {showDatePicker && (
                            <>
                                {Platform.OS === 'ios' ? (
                                    <Modal
                                        visible={showDatePicker}
                                        transparent
                                        animationType="slide"
                                        onRequestClose={() => setShowDatePicker(false)}
                                    >
                                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                                            <View style={{ backgroundColor: palette.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setShowDatePicker(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: palette.textMuted, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                                                    </TouchableOpacity>
                                                    <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary }}>Select Date</Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setShowDatePicker(false);
                                                            setShowTimePicker(true);
                                                        }}
                                                    >
                                                        <Text style={{ color: palette.primary, fontSize: 16, fontWeight: '600' }}>Next</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <DateTimePicker
                                                    value={tempDate}
                                                    mode="date"
                                                    display="spinner"
                                                    onChange={(event, date) => {
                                                        if (date) setTempDate(date);
                                                    }}
                                                    minimumDate={new Date()}
                                                    style={{ backgroundColor: palette.surface }}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                ) : (
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="date"
                                        display="default"
                                        onChange={handleDateChange}
                                        minimumDate={new Date()}
                                    />
                                )}
                            </>
                        )}
                        {/* Time Picker Modal */}
                        {showTimePicker && (
                            <>
                                {Platform.OS === 'ios' ? (
                                    <Modal
                                        visible={showTimePicker}
                                        transparent
                                        animationType="slide"
                                        onRequestClose={() => setShowTimePicker(false)}
                                    >
                                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                                            <View style={{ backgroundColor: palette.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            setShowTimePicker(false);
                                                            setShowDatePicker(true);
                                                        }}
                                                    >
                                                        <Text style={{ color: palette.textMuted, fontSize: 16, fontWeight: '600' }}>Back</Text>
                                                    </TouchableOpacity>
                                                    <Text style={{ fontSize: 18, fontWeight: '700', color: palette.textPrimary }}>Select Time</Text>
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            // Combine date and time and set expiry
                                                            setAnnouncementExpiresAt(new Date(tempDate));
                                                            setShowTimePicker(false);
                                                            setShowDatePicker(false);
                                                        }}
                                                    >
                                                        <Text style={{ color: palette.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <DateTimePicker
                                                    value={tempDate}
                                                    mode="time"
                                                    display="spinner"
                                                    onChange={(event, time) => {
                                                        if (time) setTempDate(time);
                                                    }}
                                                    is24Hour={false}
                                                    style={{ backgroundColor: palette.surface }}
                                                />
                                            </View>
                                        </View>
                                    </Modal>
                                ) : (
                                    <DateTimePicker
                                        value={tempDate}
                                        mode="time"
                                        display="default"
                                        onChange={handleTimeChange}
                                        is24Hour={false}
                                    />
                                )}
                            </>
                        )}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity
                                onPress={() => setShowAnnouncementModal(false)}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.surfaceMuted,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.textPrimary, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={async () => {
                                    if (!announcementTitle.trim() || !announcementMessage.trim()) {
                                        Alert.alert('Error', 'Title and message are required');
                                        return;
                                    }
                                    try {
                                        setLoading(true);
                                        const priority = parseInt(announcementPriority || '0', 10) || 0;
                                        const expiresAt = announcementExpiresAt
                                            ? announcementExpiresAt.toISOString()
                                            : null;
                                        await createAnnouncement({
                                            title: announcementTitle,
                                            message: announcementMessage,
                                            link: announcementLink.trim() || null,
                                            priority,
                                            expires_at: expiresAt,
                                        });
                                        const updated = await getAllAnnouncements(searchQuery);
                                        setAnnouncements(updated);
                                        setShowAnnouncementModal(false);
                                    } catch (error: any) {
                                        Alert.alert('Error', error.message || 'Failed to create announcement');
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                                style={{
                                    flex: 1,
                                    paddingVertical: 12,
                                    borderRadius: 12,
                                    backgroundColor: palette.primary,
                                    alignItems: 'center',
                                }}
                            >
                                <Text style={{ color: palette.surface, fontWeight: 'bold' }}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

// Helper function to get first image URL
const getFirstImageUrl = (home: any): string => {
    // For pending homes: images is array of { url: string }
    if (home.images && Array.isArray(home.images) && home.images.length > 0) {
        const firstImg = home.images[0];
        if (typeof firstImg === 'string') {
            // Already a URL string - check if it's a full URL
            if (firstImg.startsWith('http://') || firstImg.startsWith('https://')) {
                return firstImg;
            }
            // Convert storage path to URL
            try {
                const { data: urlData } = supabase.storage
                    .from('KanpurRealty')
                    .getPublicUrl(firstImg);
                return urlData?.publicUrl || firstImg;
            } catch {
                return firstImg;
            }
        } else if (firstImg && firstImg.url) {
            // Object with url property
            return firstImg.url;
        }
    }
    // For published/archived homes: images is string[]
    if (Array.isArray(home.images) && home.images.length > 0) {
        const firstImg = home.images[0];
        if (typeof firstImg === 'string') {
            // Convert storage path to URL if needed
            if (firstImg.startsWith('http://') || firstImg.startsWith('https://')) {
                return firstImg;
            }
            // Try to get public URL from Supabase storage
            try {
                const { data: urlData } = supabase.storage
                    .from('KanpurRealty')
                    .getPublicUrl(firstImg);
                return urlData?.publicUrl || firstImg;
            } catch {
                return firstImg;
            }
        }
    }
    return '';
};

// Card Components
function HomeCard({ home, formatDate, formatCurrency, onArchive, onDelete }: any) {
    const imageUrl = getFirstImageUrl(home);

    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 0,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                overflow: 'hidden',
            }}
        >
            {/* Property Image */}
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: palette.textMuted, fontSize: 14 }}>No Image</Text>
                </View>
            )}

            {/* Card Content */}
            <View style={{ padding: 18 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 6, letterSpacing: 0.2 }}>
                    {home.title || 'Untitled'}
                </Text>
                <Text style={{ color: palette.textSecondary, marginBottom: 8, fontSize: 14 }}>
                    {home.city}, {home.state}, {home.country}
                </Text>
                <Text style={{ color: palette.primary, fontWeight: '700', marginBottom: 10, fontSize: 16 }}>
                    {formatCurrency(home.price)}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 14 }}>
                    Created: {formatDate(home.created_at)}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        onPress={onArchive}
                        style={{
                            flex: 1,
                            paddingVertical: 11,
                            borderRadius: 10,
                            backgroundColor: '#D97757',
                            alignItems: 'center',
                            shadowColor: '#D97757',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 2,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Archive</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onDelete}
                        style={{
                            flex: 1,
                            paddingVertical: 11,
                            borderRadius: 10,
                            backgroundColor: palette.danger,
                            alignItems: 'center',
                            shadowColor: palette.danger,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 2,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function PendingHomeCard({ home, formatDate, formatCurrency, getStatusColor, onApprove, onReject, onViewImages }: any) {
    const imageUrl = getFirstImageUrl(home);

    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 0,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                overflow: 'hidden',
            }}
        >
            {/* Property Image */}
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: palette.textMuted, fontSize: 14 }}>No Image</Text>
                </View>
            )}

            {/* Card Content */}
            <View style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, flex: 1, letterSpacing: 0.2 }}>
                        {home.title || 'Untitled'}
                    </Text>
                    <View
                        style={{
                            backgroundColor: getStatusColor(home.status),
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                            marginLeft: 8,
                        }}
                    >
                        <Text style={{ color: palette.surface, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {home.status}
                        </Text>
                    </View>
                </View>
                <Text style={{ color: palette.textSecondary, marginBottom: 6, fontSize: 14 }}>
                    {home.city}, {home.state}, {home.country}
                </Text>
                <Text style={{ color: palette.primary, fontWeight: '700', marginBottom: 8, fontSize: 16 }}>
                    {formatCurrency(home.price)}
                </Text>
                {home.userDetails && (
                    <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 6 }}>
                        Submitted by: {home.userDetails.name || home.userDetails.email}
                    </Text>
                )}
                <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 12 }}>
                    Created: {formatDate(home.created_at)}
                </Text>
                {home.images && home.images.length > 0 && (
                    <TouchableOpacity
                        onPress={onViewImages}
                        style={{
                            paddingVertical: 9,
                            paddingHorizontal: 14,
                            borderRadius: 10,
                            backgroundColor: palette.primary,
                            alignSelf: 'flex-start',
                            marginBottom: 12,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 13 }}>
                            View {home.images.length} image{home.images.length !== 1 ? 's' : ''}
                        </Text>
                    </TouchableOpacity>
                )}
                {home.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                            onPress={onApprove}
                            style={{
                                flex: 1,
                                paddingVertical: 11,
                                borderRadius: 10,
                                backgroundColor: palette.primary,
                                alignItems: 'center',
                                shadowColor: palette.primary,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 2,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onReject}
                            style={{
                                flex: 1,
                                paddingVertical: 11,
                                borderRadius: 10,
                                backgroundColor: palette.danger,
                                alignItems: 'center',
                                shadowColor: palette.danger,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.2,
                                shadowRadius: 3,
                                elevation: 2,
                            }}
                            activeOpacity={0.8}
                        >
                            <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Reject</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
}

function ArchivedHomeCard({ home, formatDate, formatCurrency, onUnarchive }: any) {
    const imageUrl = getFirstImageUrl(home);

    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 0,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
                overflow: 'hidden',
            }}
        >
            {/* Property Image */}
            {imageUrl ? (
                <Image
                    source={{ uri: imageUrl }}
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                    }}
                    resizeMode="cover"
                />
            ) : (
                <View
                    style={{
                        width: '100%',
                        height: 200,
                        backgroundColor: palette.surfaceMuted,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text style={{ color: palette.textMuted, fontSize: 14 }}>No Image</Text>
                </View>
            )}

            {/* Card Content */}
            <View style={{ padding: 18 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 6, letterSpacing: 0.2 }}>
                    {home.title || 'Untitled'}
                </Text>
                <Text style={{ color: palette.textSecondary, marginBottom: 6, fontSize: 14 }}>
                    {home.city}, {home.state}, {home.country}
                </Text>
                <Text style={{ color: palette.primary, fontWeight: '700', marginBottom: 8, fontSize: 16 }}>
                    {formatCurrency(home.price)}
                </Text>
                <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 14 }}>
                    Archived: {home.archived_at ? formatDate(home.archived_at) : 'N/A'}
                </Text>
                <TouchableOpacity
                    onPress={onUnarchive}
                    style={{
                        paddingVertical: 11,
                        borderRadius: 10,
                        backgroundColor: palette.primary,
                        alignItems: 'center',
                        shadowColor: palette.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 2,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Unarchive</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function UserCard({ user, formatDate, onDelete }: any) {
    const userRole = user.metadata?.role || user.role || 'user';
    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 4, letterSpacing: 0.2 }}>
                {user.email}
            </Text>
            <Text style={{ color: palette.textSecondary, marginBottom: 6, fontSize: 14 }}>
                {user.name || 'No name provided'}
            </Text>
            {user.phone && (
                <Text style={{ color: palette.textSecondary, marginBottom: 8, fontSize: 13 }}>Phone: {user.phone}</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View
                    style={{
                        backgroundColor: userRole === 'admin' ? palette.primary : palette.surfaceMuted,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        borderWidth: userRole === 'admin' ? 0 : 1,
                        borderColor: palette.border,
                    }}
                >
                    <Text style={{ color: userRole === 'admin' ? palette.surface : palette.textPrimary, fontSize: 11, fontWeight: '600' }}>
                        {userRole}
                    </Text>
                </View>
                <View
                    style={{
                        backgroundColor: user.is_active ? palette.primary : palette.textMuted,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                    }}
                >
                    <Text style={{ color: palette.surface, fontSize: 11, fontWeight: '600' }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
            <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 14 }}>
                Created: {formatDate(user.created_at)}
            </Text>
            <TouchableOpacity
                onPress={onDelete}
                style={{
                    paddingVertical: 11,
                    borderRadius: 10,
                    backgroundColor: palette.danger,
                    alignItems: 'center',
                    shadowColor: palette.danger,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 3,
                    elevation: 2,
                }}
                activeOpacity={0.8}
            >
                <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Delete User</Text>
            </TouchableOpacity>
        </View>
    );
}

function SubscriptionCard({ subscription, formatDate, getStatusColor }: any) {
    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 6, letterSpacing: 0.2 }}>
                {subscription.email}
            </Text>
            <Text style={{ color: palette.textSecondary, marginBottom: 10, fontSize: 14 }}>Plan: {subscription.plan}</Text>
            <View
                style={{
                    backgroundColor: getStatusColor(subscription.status),
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                    marginBottom: 10,
                }}
            >
                <Text style={{ color: palette.surface, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {subscription.status}
                </Text>
            </View>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                Expires: {formatDate(subscription.expires_at)}
            </Text>
        </View>
    );
}

function ContactCard({ contact, formatDate }: any) {
    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 4, letterSpacing: 0.2 }}>
                {contact.first_name} {contact.last_name}
            </Text>
            <Text style={{ color: palette.textSecondary, marginBottom: 8, fontSize: 14 }}>{contact.email}</Text>
            <Text style={{ color: palette.textPrimary, marginBottom: 10, fontSize: 14, lineHeight: 20 }}>{contact.message}</Text>
            <Text style={{ color: palette.textMuted, fontSize: 12 }}>{formatDate(contact.created_at)}</Text>
        </View>
    );
}

function RemovalRequestCard({ request, formatDate, getStatusColor, onApprove, onReject }: any) {
    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, marginBottom: 6, letterSpacing: 0.2 }}>
                {request.property_title}
            </Text>
            {request.users && (
                <Text style={{ color: palette.textSecondary, marginBottom: 6, fontSize: 14 }}>
                    User: {request.users.name || request.users.email}
                </Text>
            )}
            <Text style={{ color: palette.textPrimary, marginBottom: 10, fontSize: 14, lineHeight: 20 }}>{request.removal_reason}</Text>
            <View
                style={{
                    backgroundColor: getStatusColor(request.request_status),
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 12,
                    alignSelf: 'flex-start',
                    marginBottom: 12,
                }}
            >
                <Text style={{ color: palette.surface, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {request.request_status}
                </Text>
            </View>
            <Text style={{ color: palette.textMuted, fontSize: 12, marginBottom: 14 }}>
                Requested: {formatDate(request.created_at)}
            </Text>
            {request.request_status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        onPress={onApprove}
                        style={{
                            flex: 1,
                            paddingVertical: 11,
                            borderRadius: 10,
                            backgroundColor: palette.primary,
                            alignItems: 'center',
                            shadowColor: palette.primary,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 2,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onReject}
                        style={{
                            flex: 1,
                            paddingVertical: 11,
                            borderRadius: 10,
                            backgroundColor: palette.danger,
                            alignItems: 'center',
                            shadowColor: palette.danger,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 3,
                            elevation: 2,
                        }}
                        activeOpacity={0.8}
                    >
                        <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Reject</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function AnnouncementCard({
    announcement,
    formatDate,
    onToggleActive,
    onDelete,
}: {
    announcement: Announcement;
    formatDate: (date: string) => string;
    onToggleActive: () => void;
    onDelete: () => void;
}) {
    return (
        <View
            style={{
                backgroundColor: palette.surface,
                borderRadius: 16,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: palette.border,
                shadowColor: palette.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
            }}
        >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: palette.textPrimary, flex: 1, marginRight: 8 }}>
                    {announcement.title}
                </Text>
                <View
                    style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: announcement.is_active ? palette.primary : palette.textMuted,
                    }}
                >
                    <Text style={{ color: palette.surface, fontSize: 11, fontWeight: '600' }}>
                        {announcement.is_active ? 'Active' : 'Inactive'}
                    </Text>
                </View>
            </View>
            <Text
                style={{ color: palette.textSecondary, marginBottom: 8, fontSize: 14, lineHeight: 20 }}
                numberOfLines={3}
            >
                {announcement.message}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: palette.textMuted, fontSize: 12 }}>
                    Created: {formatDate(announcement.created_at)}
                </Text>
                {announcement.priority !== 0 && (
                    <Text style={{ color: palette.secondary, fontSize: 12 }}>
                        Priority: {announcement.priority}
                    </Text>
                )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                    onPress={onToggleActive}
                    style={{
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 10,
                        backgroundColor: announcement.is_active ? palette.textMuted : palette.primary,
                        alignItems: 'center',
                        shadowColor: announcement.is_active ? palette.textMuted : palette.primary,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 2,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>
                        {announcement.is_active ? 'Deactivate' : 'Activate'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onDelete}
                    style={{
                        flex: 1,
                        paddingVertical: 11,
                        borderRadius: 10,
                        backgroundColor: palette.danger,
                        alignItems: 'center',
                        shadowColor: palette.danger,
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.2,
                        shadowRadius: 3,
                        elevation: 2,
                    }}
                    activeOpacity={0.8}
                >
                    <Text style={{ color: palette.surface, fontWeight: '600', fontSize: 14 }}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

