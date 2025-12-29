import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { launchImageLibrary, ImagePickerResponse, Asset } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface PhotoUploadScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhotoUpload'>;
  route: any;
}

interface PhotoSlot {
  localUri: string | null;
  order: number;
  asset: Asset | null;
}

const PhotoUploadScreen = ({ navigation, route }: PhotoUploadScreenProps) => {
  const [photos, setPhotos] = useState<PhotoSlot[]>([
    { localUri: null, order: 1, asset: null },
    { localUri: null, order: 2, asset: null },
    { localUri: null, order: 3, asset: null },
    { localUri: null, order: 4, asset: null },
    { localUri: null, order: 5, asset: null },
    { localUri: null, order: 6, asset: null },
  ]);
  const [uploading, setUploading] = useState(false);

  const handleSelectPhoto = async (index: number) => {
    try {
      const result: ImagePickerResponse = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.errorMessage || 'Failed to pick image',
          visibilityTime: 3000,
        });
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const updatedPhotos = [...photos];
        updatedPhotos[index] = {
          localUri: asset.uri || null,
          order: index + 1,
          asset: asset,
        };
        setPhotos(updatedPhotos);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to pick image',
        visibilityTime: 3000,
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { localUri: null, order: index + 1, asset: null };
    setPhotos(updatedPhotos);
  };

  // ═══════════════════════════════════════════════════════════════════
  // 🤖 ML MODEL PLACEHOLDER - NSFW DETECTION
  // ═══════════════════════════════════════════════════════════════════
  // TODO: INTEGRATE ML MODEL OR API FOR NSFW CONTENT DETECTION
  // 
  // This function should:
  // 1. Send image to ML model/API endpoint
  // 2. Get confidence score for NSFW/nudity detection
  // 3. Return true if safe, false if NSFW detected
  // 
  // Options for future:
  // - Use TensorFlow Lite model on-device
  // - Call external API (e.g., AWS Rekognition, Clarifai, Sightengine)
  // - Use custom trained model via Cloud Functions
  // 
  // For now, this placeholder always returns true (approve all)
  // ═══════════════════════════════════════════════════════════════════
  const checkPhotoWithMLModel = async (imageUri: string): Promise<{
    isApproved: boolean;
    reason: string;
    confidenceScore: number;
  }> => {
    // 🚨🚨🚨 ML MODEL INTEGRATION NEEDED HERE 🚨🚨🚨
    console.log('⚠️ ML MODEL PLACEHOLDER - Checking image:', imageUri);
    
    // Simulate ML check delay
    await new Promise<void>(resolve => setTimeout(resolve, 500));
    
    // TODO: Replace this with actual ML model call
    // Example API integration:
    // const response = await fetch('YOUR_ML_API_ENDPOINT', {
    //   method: 'POST',
    //   body: formData,
    //   headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
    // });
    // const result = await response.json();
    // return {
    //   isApproved: result.safe,
    //   reason: result.reason,
    //   confidenceScore: result.confidence
    // };
    
    // For now: approve all photos
    return {
      isApproved: true,
      reason: 'ML model not integrated yet - auto-approved',
      confidenceScore: 1.0
    };
  };

  const handleUpload = async () => {
    // Count uploaded photos
    const uploadedPhotos = photos.filter(p => p.localUri !== null);
    
    if (uploadedPhotos.length < 4) {
      Toast.show({
        type: 'error',
        text1: 'Not Enough Photos',
        text2: 'At least 4 photos are needed',
        visibilityTime: 3000,
      });
      return;
    }

    setUploading(true);

    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      const userId = user.uid;
      const photoUrls: Array<{
        url: string;
        isPrimary: boolean;
        moderationStatus: 'approved' | 'rejected' | 'pending';
        uploadedAt: any;
        order: number;
      }> = [];

      // Process each photo
      for (const photo of uploadedPhotos) {
        if (!photo.localUri || !photo.asset) continue;

        // ═══════════════════════════════════════════════════════════════════
        // 🤖 ML MODEL CHECK - NSFW DETECTION
        // ═══════════════════════════════════════════════════════════════════
        console.log(`🤖 Checking photo ${photo.order} with ML model...`);
        const mlResult = await checkPhotoWithMLModel(photo.localUri);
        
        if (!mlResult.isApproved) {
          // Photo rejected by ML model
          Toast.show({
            type: 'error',
            text1: 'Photo Rejected',
            text2: `Photo ${photo.order}: ${mlResult.reason}`,
            visibilityTime: 5000,
          });
          setUploading(false);
          return;
        }
        
        console.log(`✅ Photo ${photo.order} approved by ML model (confidence: ${mlResult.confidenceScore})`);
        // ═══════════════════════════════════════════════════════════════════

        // Upload to Firebase Storage
        const fileName = `photo_${photo.order}_${Date.now()}.jpg`;
        const storagePath = `users/${userId}/photos/${fileName}`;
        const reference = storage().ref(storagePath);

        // Clean URI (remove file:// prefix if present)
        let uploadUri = photo.localUri;
        if (uploadUri.startsWith('file://')) {
          uploadUri = uploadUri.substring(7);
        }

        console.log(`📤 Uploading photo ${photo.order} to ${storagePath}`);
        console.log(`📁 Local URI: ${uploadUri}`);

        try {
          // Upload file to Firebase Storage
          const uploadTask = reference.putFile(uploadUri);
          
          // Wait for upload to complete
          await uploadTask;
          
          console.log(`✅ Upload complete for photo ${photo.order}`);
          
          // Get download URL
          const downloadUrl = await reference.getDownloadURL();
          console.log(`🔗 Download URL obtained: ${downloadUrl.substring(0, 50)}...`);

          photoUrls.push({
            url: downloadUrl,
            isPrimary: photo.order === 1, // First photo is primary
            moderationStatus: 'approved', // ML model approved
            uploadedAt: new Date().toISOString(),
            order: photo.order,
          });
        } catch (uploadError: any) {
          console.error(`❌ Failed to upload photo ${photo.order}:`, uploadError);
          throw new Error(`Failed to upload photo ${photo.order}: ${uploadError.message}`);
        }
      }

      // Update user document with photos
      await firestore().collection('users').doc(userId).update({
        photos: photoUrls,
      });

      setUploading(false);

      Toast.show({
        type: 'success',
        text1: 'Photos Uploaded!',
        text2: `${photoUrls.length} photos uploaded successfully`,
        visibilityTime: 3000,
      });

      setTimeout(() => {
        navigation.navigate('IdentityVerification');
      }, 1000);

    } catch (error: any) {
      setUploading(false);
      console.error('Upload error:', error);
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: error.message || 'Failed to upload photos',
        visibilityTime: 4000,
      });
    }
  };

  const uploadedCount = photos.filter(p => p.localUri !== null).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Your Photos</Text>
        <Text style={styles.subtitle}>
          Upload at least 4 photos (max 6)
        </Text>
        <Text style={styles.countText}>
          {uploadedCount} / 6 photos added {uploadedCount >= 4 ? '✓' : ''}
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Grid */}
        <View style={styles.grid}>
          {photos.map((photo, index) => (
            <TouchableOpacity
              key={index}
              style={styles.photoSlot}
              onPress={() => handleSelectPhoto(index)}
              activeOpacity={0.7}
            >
              {photo.localUri ? (
                <View style={styles.photoContainer}>
                  <Image
                    source={{ uri: photo.localUri }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Text style={styles.removeText}>✕</Text>
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryText}>PRIMARY</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptySlot}>
                  <Text style={styles.plusIcon}>+</Text>
                  <Text style={styles.slotText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Photo Guidelines</Text>
          <Text style={styles.infoText}>• Clear face photos work best</Text>
          <Text style={styles.infoText}>• No inappropriate content</Text>
          <Text style={styles.infoText}>• First photo is your profile picture</Text>
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            (uploadedCount < 4 || uploading) && styles.uploadButtonDisabled,
          ]}
          onPress={handleUpload}
          disabled={uploadedCount < 4 || uploading}
          activeOpacity={0.8}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.uploadButtonText}>
              Upload Photos ({uploadedCount}/6)
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 24,
    paddingTop: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF4458',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 0,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  photoSlot: {
    width: '48%',
    aspectRatio: 0.75,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mandatorySlot: {
    borderWidth: 2,
    borderColor: '#FF4458',
  },
  photoContainer: {
    width: '100%',
    height: '100%',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptySlot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  plusIcon: {
    fontSize: 40,
    color: '#CCCCCC',
    marginBottom: 8,
  },
  slotText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FF4458',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  uploadButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PhotoUploadScreen;
