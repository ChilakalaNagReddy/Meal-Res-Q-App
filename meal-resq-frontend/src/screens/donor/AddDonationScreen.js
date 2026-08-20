import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Image, Platform, Modal } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MobileAppFrame } from '../../components/MobileAppFrame';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiService } from '../../services/apiService';

export function AddDonationScreen({ navigation, user, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const currentUser = user || route?.params?.user || {};

  const [foodName, setFoodName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('Vegetarian');
  const [expiryTime, setExpiryTime] = useState('Within 4 Hours');
  const [pickupAddress, setPickupAddress] = useState(currentUser.address || 'Pop city, Main Road');
  const [description, setDescription] = useState('');
  const [foodImage, setFoodImage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [webCamModal, setWebCamModal] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const foodTypeOptions = [
    { label: '🥦 Vegetarian', value: 'Vegetarian' },
    { label: '🍗 Non-Vegetarian', value: 'Non-Vegetarian' },
    { label: '🍞 Bakery Items', value: 'Bakery Items' },
    { label: '🥛 Dairy Items', value: 'Dairy Items' },
    { label: '🍲 Cooked Meals', value: 'Cooked Meals' },
  ];

  // Auto-prefill Pickup Address with user's registered location address
  useEffect(() => {
    if (currentUser?.address) {
      setPickupAddress(currentUser.address);
    }
  }, [user, route]);


  // Clean up camera stream on unmount
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
      console.warn('WebCam access error:', e);
    }
  };

  const captureWebCamPhoto = () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined' && videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setFoodImage(dataUrl);
      }
    } catch (e) {
      console.warn('WebCam capture error:', e);
    } finally {
      stopWebCam();
      setWebCamModal(false);
    }
  };


  const handleTakePhotoCamera = async () => {
    if (Platform.OS === 'web') {
      startWebCam();
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        alert('Camera permission is required to capture live food photo!');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        const base64Str = res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : uri;
        setFoodImage(base64Str);
      }
    } catch (e) {
      console.warn('Camera photo error:', e);
    }
  };

  const handlePickImageFile = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        alert('Permission to access image files is required!');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const uri = res.assets[0].uri;
        const base64Str = res.assets[0].base64 ? `data:image/jpeg;base64,${res.assets[0].base64}` : uri;
        setFoodImage(base64Str);
      }
    } catch (e) {
      console.warn('Image file picker error:', e);
    }
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    const cleanFoodName = foodName.trim();
    const cleanQty = quantity.trim();
    const cleanAddress = pickupAddress.trim() || currentUser.address || 'Pop city, Main Road';

    if (!cleanFoodName) {
      setErrorMsg('Please enter the food name (e.g. Tamarind rice).');
      return;
    }
    if (!cleanQty) {
      setErrorMsg('Please specify quantity (e.g. 10 kgs / 50 Meals).');
      return;
    }

    const donorName = currentUser.name || user?.name || route?.params?.user?.name || 'Kavya (Food Donor)';
    const donorPhone = currentUser.phone || user?.phone || route?.params?.user?.phone || '+91 6304619188';

    setLoading(true);
    try {
      await apiService.createDonation({
        food_name: cleanFoodName,
        quantity: cleanQty,
        category: category || 'Vegetarian',
        expiry_time: expiryTime || 'Within 4 Hours',
        pickup_address: cleanAddress,
        description: description.trim(),
        image_url: foodImage,
        food_image: foodImage,
        donor_name: donorName,
        donor_phone: donorPhone,
        donor_email: currentUser.email || user?.email || '',
      });
    } catch (e) {
      console.warn('Post donation error:', e);
    } finally {
      setLoading(false);
    }

    if (navigation?.goBack) {
      navigation.goBack();
    }
  };






  return (
    <MobileAppFrame>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={[styles.backBtn, { borderColor: colors.surfaceBorder }]} onPress={() => navigation.goBack()}>
            <Text style={{ color: colors.textPrimary, fontSize: 16 }}>← Cancel</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.title, { color: colors.textPrimary }]}>🍲 {t('postFood')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Share fresh extra meals with nearby NGOs & shelters</Text>

        {errorMsg ? (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Live Camera & Image File Upload Box */}
        <View style={[styles.imageCardBox, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 8 }]}>🖼️ Food Donation Photo / Image File</Text>
          {foodImage ? (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: foodImage }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => setFoodImage(null)}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>✕ Remove Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoUploadBox}>
              <Text style={{ fontSize: 32, marginBottom: 6 }}>📸</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
                Capture live photo or upload food image files from device
              </Text>
              <View style={styles.photoBtnGrid}>
                <TouchableOpacity style={[styles.cameraActionBtn, { backgroundColor: colors.primary }]} onPress={handleTakePhotoCamera}>
                  <Text style={styles.cameraActionBtnText}>📷 {t('takePhotoCamera')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.cameraActionBtn, { backgroundColor: colors.surfaceBorder }]} onPress={handlePickImageFile}>
                  <Text style={[styles.cameraActionBtnText, { color: colors.textPrimary }]}>📁 Upload Image File</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>


        {/* Food Category / Type Selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>🥗 Select Food Type / Category</Text>
          <View style={styles.categoryPillGrid}>
            {foodTypeOptions.map((opt) => {
              const isSelected = category === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.surfaceBorder,
                    },
                  ]}
                  onPress={() => setCategory(opt.value)}
                >
                  <Text style={[styles.categoryPillText, { color: isSelected ? '#FFF' : colors.textPrimary }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Food Title / Item Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            placeholder="e.g. Vegetable Biryani & Paneer Curry"
            placeholderTextColor={colors.textMuted}
            value={foodName}
            onChangeText={setFoodName}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity / Servings</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            placeholder="e.g. 60 Meals / 15 kg"
            placeholderTextColor={colors.textMuted}
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Pickup Address (Auto-prefilled from profile)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary, height: 74 }]}
            placeholder="Complete address for pickup"
            placeholderTextColor={colors.textMuted}
            value={pickupAddress}
            onChangeText={setPickupAddress}
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Best Before / Safe Expiry</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
            value={expiryTime}
            onChangeText={setExpiryTime}
          />
        </View>

        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.accentDonor }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Post Food Donation</Text>}
        </TouchableOpacity>
      </ScrollView>

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

              <View style={styles.webCamContainer}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: 260, borderRadius: 14, objectFit: 'cover', backgroundColor: '#000' }}
                />
              </View>

              <View style={styles.webCamBtnRow}>
                <TouchableOpacity style={[styles.cameraActionBtn, { backgroundColor: colors.primary, marginTop: 14 }]} onPress={captureWebCamPhoto}>
                  <Text style={styles.cameraActionBtnText}>📸 Capture Live PC Photo</Text>
                </TouchableOpacity>
              </View>
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
  header: {
    marginBottom: 16,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
  },
  imageCardBox: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    alignItems: 'center',
  },
  photoUploadBox: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  photoBtnGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cameraActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  imagePreviewWrapper: {
    position: 'relative',
    alignSelf: 'center',
    width: 520,
    height: 280,
    maxWidth: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#10b981',
    marginVertical: 8,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },

  categoryPillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },

  formGroup: {
    marginBottom: 14,
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
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  webCamContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webCamBtnRow: {
    width: '100%',
  },
});
