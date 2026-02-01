import {
  Alert,
  Image,
  ImageSourcePropType,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useGlobalContext } from "@/lib/global-provider";
import { useRouter } from 'expo-router';
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Language } from "@/lib/i18n/translations";

import icons from "@/constants/icons";
import React, { useState, useEffect } from "react";
import * as ImagePicker from "expo-image-picker";
import { getProperties, Property } from '@/lib/supabase-db';
import { uploadUserAvatar } from '@/lib/supabase-storage';
import { updateUserProfile } from '@/lib/supabase-auth';
import { palette } from "@/constants/theme";
import { formatPriceINR } from '@/lib/formatters';
import ContactUsModal from '@/components/ContactUsModal';

interface SettingsItemProp {
  icon: ImageSourcePropType;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  showArrow?: boolean;
}

const SettingsItem = ({
  icon,
  title,
  onPress,
  textStyle,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 4,
      marginBottom: 8,
      backgroundColor: palette.surfaceMuted,
      borderRadius: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderWidth: 1,
      borderColor: palette.border,
    }}
    activeOpacity={0.7}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: palette.border,
      }}>
        <Image
          source={icon}
          style={{ width: 20, height: 20, tintColor: palette.primary }}
        />
      </View>
      <Text style={{
        fontSize: 16,
        fontWeight: '500',
        color: textStyle?.includes('red') ? palette.danger : textStyle?.includes('blue') ? palette.secondary : palette.textPrimary
      }}>
        {title}
      </Text>
    </View>

    {showArrow && (
      <Image
        source={icons.rightArrow}
        style={{ width: 20, height: 20, tintColor: palette.textMuted }}
      />
    )}
  </TouchableOpacity>
);

const Profile = () => {
  const { user, login, logout, favorites, removeFavorite, language, setLanguage } = useGlobalContext();
  const { t } = useTranslation();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notifModal, setNotifModal] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const [favoritesModal, setFavoritesModal] = useState(false); // New favorites modal
  const [propertyAdded] = useState(false);
  const [selectedHelp, setSelectedHelp] = useState<number | null>(null);
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>([]);
  const [contactUsModal, setContactUsModal] = useState(false);

  useEffect(() => {
    // Fetch favorite properties on mount or when favorites change
    if (favorites.length > 0) {
      getProperties(undefined, undefined, undefined, true).then(props => {
        setFavoriteProperties(props.filter(p => p.id && favorites.includes(String(p.id))));
      }).catch(error => {
        console.error('Error fetching favorite properties:', error);
        setFavoriteProperties([]);
      });
    } else {
      setFavoriteProperties([]);
    }
  }, [favorites]);

  const handleLanguageSelect = async (lang: Language) => {
    try {
      await setLanguage(lang);
      Alert.alert(t('language.languageChanged'), `${t('language.appLanguageSetTo')} ${lang}.`);
      setLangModal(false);
    } catch (error) {
      console.error('Error saving language preference:', error);
      Alert.alert(t('common.error'), t('language.failedToSaveLanguage'));
    }
  };

  const languages: Language[] = [
    "English", "Spanish", "French", "German", "Chinese", "Japanese", "Hindi", "Arabic", "Portuguese", "Russian"
  ];
  const helpOptions = [
    {
      question: t('help.howToAddProperty'),
      answer: t('help.howToAddPropertyAnswer')
    },
    {
      question: t('help.howToEditProfile'),
      answer: t('help.howToEditProfileAnswer')
    },
    {
      question: t('help.howToContactSupport'),
      answer: t('help.howToContactSupportAnswer')
    },
    {
      question: t('help.howToResetPassword'),
      answer: t('help.howToResetPasswordAnswer')
    },
    {
      question: t('help.howToDeleteAccount'),
      answer: t('help.howToDeleteAccountAnswer')
    }
  ];

  const handleEditPress = () => {
    setNewName(user?.name || "");
    setNewPhoto(null);
    setModalVisible(true);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewPhoto(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    let photoURL = user?.avatar || "";
    try {
      if (newPhoto && user?.id) {
        // Upload new photo to Supabase Storage
        console.log('Uploading profile photo to Supabase Storage:', newPhoto);
        try {
          photoURL = await uploadUserAvatar(newPhoto, user.id);
          console.log('Supabase Storage profile photo public URL:', photoURL);
        } catch (uploadError) {
          console.error('Supabase Storage upload error:', uploadError);
          Alert.alert(t('common.error'), t('common.error'));
          setLoading(false);
          return;
        }
      }

      // Update user profile in Supabase
      const updatedUser = await updateUserProfile({
        name: newName,
        avatar_url: photoURL,
      });

      // Update context
      login(updatedUser);
      Alert.alert(t('common.success'), t('profile.profileUpdated'));
      setModalVisible(false);
    } catch (error: unknown) {
      console.error('Error updating profile:', error);
      const errorMessage = error instanceof Error ? error.message : t('common.error');
      Alert.alert(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Navigate to sign-in page immediately after logout
      router.replace('/sign-in');
    } catch {
      Alert.alert(t('common.error'), t('profile.logoutFailed'));
    }
  };

  const handleSettingPress = (title: string) => {
    if (title === t('profile.editProfile')) {
      setNewName(user?.name || "");
      setModalVisible(true);
    }
    if (title === t('profile.favorites')) {
      setFavoritesModal(true);
    }
    if (title === t('notifications.title') && propertyAdded) setNotifModal(true);
    if (title === t('profile.language')) setLangModal(true);
    if (title === t('profile.helpCenter')) {
      setHelpModal(true);
      setSelectedHelp(null);
    }
    if (title === 'Contact Us' || title === t('profile.contactUs')) {
      setContactUsModal(true);
    }
  };

  const { width } = Dimensions.get('window');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: palette.textPrimary, letterSpacing: 0.3 }}>
            {t('profile.title')}
          </Text>
        </View>

        {/* Profile Card */}
        <View style={{
          marginHorizontal: 20,
          marginBottom: 24,
          backgroundColor: palette.surfaceMuted,
          borderRadius: 20,
          padding: 24,
          borderWidth: 1,
          borderColor: palette.border,
          shadowColor: palette.shadow,
          shadowOpacity: 0.15,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}>
          <View style={{ alignItems: 'center' }}>
            {/* Profile Picture with Edit Button */}
            <View style={{ position: 'relative', marginBottom: 16 }}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    borderWidth: 3,
                    borderColor: palette.primary,
                    backgroundColor: palette.surface,
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    borderWidth: 3,
                    borderColor: palette.primary,
                    backgroundColor: palette.surfaceMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image
                    source={icons.person}
                    style={{
                      width: 50,
                      height: 50,
                      tintColor: palette.textMuted,
                    }}
                  />
                </View>
              )}
              <TouchableOpacity
                onPress={handleEditPress}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: palette.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: palette.surfaceMuted,
                  shadowColor: palette.shadow,
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  shadowOffset: { width: 0, height: 2 },
                  elevation: 4,
                }}
                activeOpacity={0.8}
              >
                <Image
                  source={icons.edit}
                  style={{ width: 18, height: 18, tintColor: palette.surface }}
                />
              </TouchableOpacity>
            </View>

            <Text style={{
              fontSize: 22,
              fontWeight: 'bold',
              color: palette.textPrimary,
              marginBottom: 4,
              letterSpacing: 0.2,
            }}>
              {user?.name || 'User'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: palette.textMuted,
              marginBottom: 20,
            }}>
              {user?.email || ''}
            </Text>

            {/* Logout Button */}
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                backgroundColor: palette.danger,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                shadowColor: palette.danger,
                shadowOpacity: 0.3,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 4 },
                elevation: 4,
              }}
              activeOpacity={0.85}
            >
              <Image
                source={icons.logout}
                style={{ width: 20, height: 20, tintColor: '#fff', marginRight: 8 }}
              />
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Section */}
        <View style={{ marginHorizontal: 20, marginBottom: 32 }}>
          <View style={{
            borderBottomWidth: 1,
            borderColor: palette.border,
            marginBottom: 20
          }} />
          <Text style={{
            fontWeight: 'bold',
            fontSize: 22,
            marginBottom: 16,
            color: palette.textPrimary,
            letterSpacing: 0.2,
          }}>
            {t('profile.settings')}
          </Text>

          <SettingsItem
            icon={icons.person}
            title={t('profile.editProfile')}
            onPress={() => handleSettingPress(t('profile.editProfile'))}
          />

          <SettingsItem
            icon={icons.heart}
            title={`${t('profile.favorites')}${favorites.length > 0 ? ` (${favorites.length})` : ''}`}
            onPress={() => handleSettingPress(t('profile.favorites'))}
            textStyle={favorites.length > 0 ? "text-red-500" : ""}
          />

          <SettingsItem
            icon={icons.info}
            title="My Properties"
            onPress={() => router.push('/(root)/property-status' as any)}
          />

          <SettingsItem
            icon={icons.language}
            title={t('profile.language')}
            onPress={() => handleSettingPress(t('profile.language'))}
          />

          <SettingsItem
            icon={icons.info}
            title={t('profile.helpCenter')}
            onPress={() => handleSettingPress(t('profile.helpCenter'))}
          />

          <SettingsItem
            icon={icons.chat}
            title="Contact Us"
            onPress={() => handleSettingPress('Contact Us')}
          />

        </View>
      </ScrollView>

      {/* Favorites Modal */}
      <Modal
        visible={favoritesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFavoritesModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 20,
              padding: 24,
              width: width * 0.9,
              maxWidth: 500,
              maxHeight: '80%',
              borderWidth: 1,
              borderColor: palette.border,
              shadowColor: palette.shadow,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.textPrimary }}>
                  {t('favorites.myFavorites')}
                </Text>
                <TouchableOpacity
                  onPress={() => setFavoritesModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: palette.textMuted, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              {favoriteProperties.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 48, marginBottom: 16 }}>❤️</Text>
                  <Text style={{
                    textAlign: 'center',
                    color: palette.textMuted,
                    fontSize: 16,
                    lineHeight: 24,
                  }}>
                    {t('favorites.noFavorites')}{'\n'}{t('favorites.noFavoritesDescription')}
                  </Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '70%' }}>
                  {favoriteProperties.map((property) => (
                    <View
                      key={property.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 12,
                        padding: 12,
                        backgroundColor: palette.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: palette.border,
                      }}
                    >
                      <Image
                        source={{ uri: property.image }}
                        style={{ width: 64, height: 64, borderRadius: 12, marginRight: 12 }}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: palette.textPrimary, marginBottom: 4 }}>
                          {property.name}
                        </Text>
                        <Text style={{ fontSize: 14, color: palette.textMuted, marginBottom: 4 }}>
                          {property.address}
                        </Text>
                        <Text style={{ color: palette.primary, fontWeight: 'bold', fontSize: 16 }}>
                          {formatPriceINR(property.price)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => removeFavorite(String(property.id!))}
                        style={{
                          backgroundColor: palette.danger,
                          paddingVertical: 8,
                          paddingHorizontal: 16,
                          borderRadius: 8,
                          marginLeft: 8,
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{t('favorites.remove')}</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 20,
              padding: 24,
              width: width * 0.85,
              maxWidth: 400,
              borderWidth: 1,
              borderColor: palette.border,
              shadowColor: palette.shadow,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 10,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.textPrimary }}>
                  {t('profile.editProfile')}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: palette.textMuted, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <View style={{ position: 'relative' }}>
                  {newPhoto || user?.avatar ? (
                    <Image
                      source={{ uri: newPhoto || user?.avatar || '' }}
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        borderWidth: 3,
                        borderColor: palette.primary,
                        backgroundColor: palette.surface,
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: 100,
                        height: 100,
                        borderRadius: 50,
                        borderWidth: 3,
                        borderColor: palette.primary,
                        backgroundColor: palette.surfaceMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Image
                        source={icons.person}
                        style={{
                          width: 50,
                          height: 50,
                          tintColor: palette.textMuted,
                        }}
                      />
                    </View>
                  )}
                  <TouchableOpacity
                    onPress={pickImage}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: palette.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: palette.surfaceMuted,
                    }}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={icons.edit}
                      style={{ width: 18, height: 18, tintColor: palette.surface }}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={{ marginTop: 12, fontSize: 14, color: palette.textMuted }}>
                  {t('profile.tapIconToChangePhoto')}
                </Text>
              </View>

              <Text style={{ fontSize: 16, fontWeight: '500', color: palette.textPrimary, marginBottom: 8 }}>
                {t('profile.name')}
              </Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t('profile.enterYourName')}
                placeholderTextColor={palette.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: palette.border,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 24,
                  color: palette.textPrimary,
                  backgroundColor: palette.surface,
                  fontSize: 16,
                }}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: palette.surface,
                    borderWidth: 1,
                    borderColor: palette.border,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: palette.textPrimary, fontWeight: '600', fontSize: 16 }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={loading}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: palette.primary,
                    alignItems: 'center',
                    shadowColor: palette.primary,
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 4,
                  }}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={palette.surface} />
                  ) : (
                    <Text style={{ color: palette.surface, fontWeight: 'bold', fontSize: 16 }}>{t('common.save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Notifications Modal */}
      <Modal
        visible={notifModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNotifModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 20,
              padding: 24,
              width: width * 0.85,
              maxWidth: 400,
              borderWidth: 1,
              borderColor: palette.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.textPrimary }}>
                  {t('notifications.title')}
                </Text>
                <TouchableOpacity
                  onPress={() => setNotifModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: palette.textMuted, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: palette.textSecondary, fontSize: 16, marginBottom: 20 }}>
                {t('notifications.newPropertyAdded')}
              </Text>
              <TouchableOpacity
                onPress={() => setNotifModal(false)}
                style={{
                  backgroundColor: palette.primary,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: palette.surface, fontWeight: 'bold', fontSize: 16 }}>{t('common.close')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Language Modal */}
      <Modal
        visible={langModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLangModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 20,
              padding: 24,
              width: width * 0.85,
              maxWidth: 400,
              maxHeight: '70%',
              borderWidth: 1,
              borderColor: palette.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.textPrimary }}>
                  {t('language.selectLanguage')}
                </Text>
                <TouchableOpacity
                  onPress={() => setLangModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: palette.textMuted, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {languages.map((lang, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleLanguageSelect(lang)}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      backgroundColor: language === lang ? palette.primarySoft : palette.surface,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: language === lang ? palette.primary : palette.border,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 16,
                      color: language === lang ? palette.primary : palette.textPrimary,
                      fontWeight: language === lang ? '600' : '400',
                    }}>
                      {lang}
                    </Text>
                    {language === lang && (
                      <Text style={{ fontSize: 18, color: palette.primary }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Help Center Modal */}
      <Modal
        visible={helpModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHelpModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{
              backgroundColor: palette.surfaceMuted,
              borderRadius: 20,
              padding: 24,
              width: width * 0.85,
              maxWidth: 400,
              maxHeight: '70%',
              borderWidth: 1,
              borderColor: palette.border,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: palette.textPrimary }}>
                  {t('help.title')}
                </Text>
                <TouchableOpacity
                  onPress={() => setHelpModal(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: palette.surface,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: palette.textMuted, fontWeight: 'bold' }}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false}>
                {selectedHelp === null ? (
                  helpOptions.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setSelectedHelp(idx)}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        marginBottom: 12,
                        backgroundColor: palette.surface,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: palette.border,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ fontSize: 16, color: palette.primary, fontWeight: '500' }}>
                        {opt.question}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View>
                    <TouchableOpacity
                      onPress={() => setSelectedHelp(null)}
                      style={{
                        paddingVertical: 8,
                        marginBottom: 16,
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: palette.primary, fontWeight: '600', fontSize: 16 }}>← {t('common.back')}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: palette.textPrimary, marginBottom: 12 }}>
                      {helpOptions[selectedHelp].question}
                    </Text>
                    <Text style={{ fontSize: 16, color: palette.textSecondary, lineHeight: 24 }}>
                      {helpOptions[selectedHelp].answer}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Contact Us Modal */}
      <ContactUsModal
        visible={contactUsModal}
        onClose={() => setContactUsModal(false)}
        userEmail={user?.email}
        userName={user?.name}
      />
    </SafeAreaView>
  );
};

export default Profile;
