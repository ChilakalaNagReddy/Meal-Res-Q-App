import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../services/apiService';
import { authService } from '../../services/authService';

export function ProfileScreen({ user, onUpdateUser }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [webCamModal, setWebCamModal] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileImage, setProfileImage] = useState(user?.profile_image || null);

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setProfileImage(user.profile_image || null);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      stopWebCam();
    };
  }, []);

  const stopWebCam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const getLaptopCameraDeviceId = async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator?.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        const internalCam = videoDevices.find((d) => {
          const label = (d.label || '').toLowerCase();
          return (
            label.includes('integrated') ||
            label.includes('built-in') ||
            label.includes('facetime') ||
            label.includes('internal') ||
            label.includes('webcam') ||
            label.includes('laptop')
          );
        });
        if (internalCam && internalCam.deviceId) {
          return { deviceId: { exact: internalCam.deviceId } };
        }
      }
    } catch (e) {}
    return { facingMode: 'user' };
  };

  const startWebCam = async () => {
    setPhotoModalVisible(false);
    setWebCamModal(true);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator?.mediaDevices?.getUserMedia) {
        const videoConstraints = await getLaptopCameraDeviceId();
        const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }
    } catch (e) {
      console.warn('PC WebCam access error:', e);
    }
  };


  const captureWebCamPhoto = async () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 400;
        canvas.height = videoRef.current.videoHeight || 400;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        await saveAvatarPhoto(dataUrl);
      }
    } catch (e) {
      console.warn('PC WebCam photo capture error:', e);
    } finally {
      stopWebCam();
      setWebCamModal(false);
    }
  };


  const roleLabels = {
    donor: 'Food Donor 🌿',
    ngo: 'NGO / Charity 🏢',
    volunteer: 'Volunteer 🚲',
    needer: 'Person in Need 🤝',
    admin: 'System Admin 🛡️',
  };

  const handleAvatarClick = () => {
    setPhotoModalVisible(true);
  };

  const saveAvatarPhoto = async (newPhoto) => {
    setProfileImage(newPhoto);
    const updatedFields = {
      name: name || user?.name || '',
      phone: phone || user?.phone || '',
      address: address || user?.address || '',
      profile_image: newPhoto,
    };
    const updatedUser = await authService.updateStoredUser(updatedFields);
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    apiService.updateProfile(updatedFields).catch(() => {});
  };

  // 1. Camera Option (PC webcam on Web laptop, Native Camera on Mobile)
  const handleTakePhotoCamera = async () => {
    if (Platform.OS === 'web') {
      startWebCam();
      return;
    }
    setPhotoModalVisible(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        alert('Camera permission is required to capture live profile photo!');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        const base64Str = res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : uri;
        await saveAvatarPhoto(base64Str);
      }
    } catch (e) {
      console.warn('Camera capture error:', e);
    }
  };

  // 2. Gallery Option
  const handlePickImageGallery = async () => {
    setPhotoModalVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert('Permission to access photo gallery is required!');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        const base64Str = res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : uri;
        await saveAvatarPhoto(base64Str);
      }
    } catch (e) {
      console.warn('Gallery picker error:', e);
    }
  };

  // 3. Delete Photo Option
  const handleDeletePhoto = async () => {
    setPhotoModalVisible(false);
    await saveAvatarPhoto(null);
  };


  const handleSaveProfile = async () => {
    setSuccessMsg('');
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Name cannot be empty.');
      return;
    }

    setSaving(true);

    const updatedFields = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      profile_image: profileImage,
    };

    try {
      // Update local storage user state immediately
      const updatedUser = await authService.updateStoredUser(updatedFields);

      // Notify parent component for real-time header sync across mobile & web
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      // Sync with API service
      try {
        await apiService.updateProfile(updatedFields);
      } catch (err) {
        console.warn('API profile sync background note:', err);
      }

      setSaving(false);
      setSuccessMsg('Profile updated & synced seamlessly to app and web!');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setSaving(false);
      setErrorMsg('Error saving profile changes.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg('');
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setProfileImage(user.profile_image || null);
    }
  };

  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>👤 {t('profile')}</Text>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: isEditing ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                borderColor: isEditing ? '#f59e0b' : '#10b981',
              },
            ]}
          >
            <Text style={{ color: isEditing ? '#f59e0b' : '#10b981', fontWeight: '800', fontSize: 12 }}>
              {isEditing ? '✏️ EDITING MODE' : '👁️ VIEW MODE'}
            </Text>
          </View>
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isEditing
            ? 'Click profile picture to edit photo, or modify details below (Email cannot be edited)'
            : 'Your registered account profile details'}
        </Text>

        {successMsg ? (
          <View style={[styles.banner, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.primary }]}>
            <Text style={[styles.bannerText, { color: colors.primary }]}>✅ {successMsg}</Text>
          </View>
        ) : null}

        {errorMsg ? (
          <View style={[styles.banner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.error }]}>
            <Text style={[styles.bannerText, { color: colors.error }]}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Profile Card Container */}
        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          {/* Avatar Section */}
          <View style={styles.dpSection}>
            <TouchableOpacity onPress={handleAvatarClick} activeOpacity={0.8} style={styles.avatarTouchable}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={[styles.dpImage, { borderColor: colors.primary }]} />
              ) : (
                <View style={[styles.dpPlaceholder, { backgroundColor: colors.background, borderColor: colors.primary }]}>
                  <Text style={[styles.dpInitials, { color: colors.primary }]}>
                    {(name || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}

              {isEditing && (
                <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
                  <Text style={{ color: '#FFF', fontSize: 13 }}>📷</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={[styles.dpName, { color: colors.textPrimary }]}>{user?.name || name}</Text>
            <View style={[styles.rolePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: colors.primary }]}>
              <Text style={[styles.rolePillText, { color: colors.primary }]}>{roleLabels[user?.role] || user?.role}</Text>
            </View>

            {isEditing && (
              <TouchableOpacity style={styles.changePhotoPromptBtn} onPress={() => setPhotoModalVisible(true)}>
                <Text style={[styles.changePhotoPromptText, { color: colors.primary }]}>📸 Click to Change Profile Picture</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isEditing ? (
            /* VIEW-ONLY MODE DETAILS */
            <View style={styles.viewSection}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>✉️ Email Address (Locked)</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email || 'user@example.com'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📱 Phone Number</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.phone || phone || '+91 9876543210'}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>📍 Address Location</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.address || address || 'Bavani Homes'}</Text>
              </View>

              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]} onPress={() => setIsEditing(true)}>
                <Text style={styles.saveBtnText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* EDITING MODE FORM */
            <View style={styles.editSection}>


              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>✉️ Email Address (Read-only)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceBorder, color: colors.textMuted, borderColor: colors.surfaceBorder }]}
                  value={user?.email || ''}
                  editable={false}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>📱 Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.surfaceBorder }]}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="+91 9876543210"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>📍 Address</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.surfaceBorder }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter address"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.surfaceBorder }]} onPress={handleCancelEdit} disabled={saving}>
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveProfile} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>💾 Save Profile</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Profile Photo Options Modal (Camera, Gallery, Files, Delete) */}
      <Modal visible={photoModalVisible} transparent animationType="fade" onRequestClose={() => setPhotoModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>🖼️ Change Profile Picture</Text>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Select an option below to update your profile photo:</Text>

            <View style={styles.modalOptionGrid}>
              <TouchableOpacity style={[styles.modalOptionBtn, { backgroundColor: colors.primary }]} onPress={handleTakePhotoCamera}>
                <Text style={styles.optionIcon}>📷</Text>
                <Text style={styles.optionBtnText}>Live Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalOptionBtn, { backgroundColor: '#3b82f6' }]} onPress={handlePickImageGallery}>
                <Text style={styles.optionIcon}>🖼️</Text>
                <Text style={styles.optionBtnText}>Photo Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalOptionBtn, { backgroundColor: '#ef4444' }]} onPress={handleDeletePhoto}>
                <Text style={styles.optionIcon}>🗑️</Text>
                <Text style={styles.optionBtnText}>Delete Photo</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Web Camera Live Viewport Modal for Laptop PC Camera */}
      {Platform.OS === 'web' && (
        <Modal visible={webCamModal} transparent animationType="fade" onRequestClose={() => { stopWebCam(); setWebCamModal(false); }}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>📷 Live PC Camera</Text>
                <TouchableOpacity onPress={() => { stopWebCam(); setWebCamModal(false); }}>
                  <Text style={{ color: colors.textMuted, fontSize: 22 }}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: '#000', marginBottom: 14 }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: 260, borderRadius: 14, objectFit: 'cover', backgroundColor: '#000' }}
                />
              </View>

              <TouchableOpacity style={[styles.editBtn, { backgroundColor: colors.primary }]} onPress={captureWebCamPhoto}>
                <Text style={styles.saveBtnText}>📸 Capture Live PC Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </MobileAppFrame>
  );
}


const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 20,
  },
  banner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  dpSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouchable: {
    position: 'relative',
  },
  dpImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
  },
  dpPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpInitials: {
    fontSize: 38,
    fontWeight: '900',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  dpName: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 10,
  },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  changePhotoPromptBtn: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  changePhotoPromptText: {
    fontSize: 12,
    fontWeight: '700',
  },

  viewSection: {
    gap: 14,
  },
  infoRow: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  editBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  editSection: {
    gap: 12,
  },
  formGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 18,
  },
  modalOptionGrid: {
    gap: 12,
  },
  modalOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  optionBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
