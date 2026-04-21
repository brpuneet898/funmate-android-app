/**
 * CREATE EVENT — STEP 2: DATE & LOCATION
 * Start/End datetime, Venue Name, Address, Current Location
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  PermissionsAndroid,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import DatePicker from 'react-native-date-picker';
import LinearGradient from 'react-native-linear-gradient';
import Geolocation from '@react-native-community/geolocation';
import { encodeGeoHash } from '../../../utils/geoHash';
import { Step1Data } from './CreateEventStep1Screen';

export type Step2Data = {
  startTime: string;   // ISO string
  endTime: string;     // ISO string
  venue: string;
  address: string;
  lat: number | null;
  lng: number | null;
  geoHash: string;
};

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
};

const CreateEventStep2Screen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { step1 } = route.params as { step1: Step1Data };

  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
  const defaultEnd = new Date(defaultStart.getTime() + 3 * 60 * 60 * 1000); // +3h

  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(defaultEnd);
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);
  const [venue, setVenue] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoHash, setGeoHash] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const useCurrentLocation = async () => {
    try {
      // Android requires explicit runtime permission request
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Funmate needs your location to pin your event on the map.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature.');
        return;
      }
    } catch (err) {
      console.warn('Permission error:', err);
      return;
    }

    setFetchingLocation(true);
    Geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        setLat(latitude);
        setLng(longitude);
        setGeoHash(encodeGeoHash(latitude, longitude));
        setFetchingLocation(false);
        Alert.alert(
          'Location Captured',
          'Your current coordinates have been saved. Fill in the venue name and address below.',
          [{ text: 'OK' }]
        );
      },
      error => {
        setFetchingLocation(false);
        Alert.alert('Location Error', error.message);
      },
      {
        enableHighAccuracy: false,  // use network/cell tower — much faster than GPS
        timeout: 15000,
        maximumAge: 60000,          // accept a cached fix up to 1 min old
      }
    );
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    const now = new Date();
    if (startTime <= now) newErrors.startTime = 'Start time must be in the future';
    if (endTime <= startTime) newErrors.endTime = 'End time must be after start time';
    if (!venue.trim()) newErrors.venue = 'Venue name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const step2: Step2Data = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      venue: venue.trim(),
      address: address.trim(),
      lat,
      lng,
      geoHash,
    };
    navigation.navigate('CreateEventStep3', { step1, step2 });
  };

  return (
    <ImageBackground
      source={require('../../../assets/images/bg_party.webp')}
      style={styles.container}
      resizeMode="cover"
      blurRadius={6}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Event</Text>
        <View style={styles.backButton} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepContainer}>
        {[1, 2, 3, 4].map(step => (
          <View key={step} style={styles.stepWrapper}>
            <View style={[styles.stepBar, step <= 2 && styles.stepBarActive]} />
            <Text style={[styles.stepText, step === 2 && styles.stepTextActive]}>{step}</Text>
          </View>
        ))}
      </View>

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(120, insets.bottom + 104) }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        enableOnAndroid
        extraScrollHeight={220}
        enableAutomaticScroll
      >
        <Text style={styles.stepTitle}>Date & Location</Text>
        <Text style={styles.stepSubtitle}>When and where is your event happening?</Text>

        {/* Start Time */}
        <View style={styles.field}>
          <Text style={styles.label}>Start Date & Time <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.datePicker, errors.startTime && styles.inputError]}
            onPress={() => setStartPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color="#06B6D4" />
            <Text style={styles.dateText}>{formatDateTime(startTime)}</Text>
          </TouchableOpacity>
          {errors.startTime ? <Text style={styles.errorText}>{errors.startTime}</Text> : null}
        </View>

        {/* End Time */}
        <View style={styles.field}>
          <Text style={styles.label}>End Date & Time <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.datePicker, errors.endTime && styles.inputError]}
            onPress={() => setEndPickerOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={18} color="#06B6D4" />
            <Text style={styles.dateText}>{formatDateTime(endTime)}</Text>
          </TouchableOpacity>
          {errors.endTime ? <Text style={styles.errorText}>{errors.endTime}</Text> : null}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Venue Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Venue Name <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.venue && styles.inputError]}
            placeholder="e.g. Phoenix Palladium Mall"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={venue}
            onChangeText={v => { setVenue(v); if (errors.venue) setErrors(e => ({ ...e, venue: '' })); }}
          />
          {errors.venue ? <Text style={styles.errorText}>{errors.venue}</Text> : null}
        </View>

        {/* Address */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Address <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.textarea, errors.address && styles.inputError]}
            placeholder="Street, Area, City, State"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={address}
            onChangeText={a => { setAddress(a); if (errors.address) setErrors(e => ({ ...e, address: '' })); }}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
        </View>

        {/* Use Current Location */}
        <TouchableOpacity
          style={[styles.locationButton, lat !== null && styles.locationButtonActive]}
          onPress={useCurrentLocation}
          disabled={fetchingLocation}
          activeOpacity={0.8}
        >
          <Ionicons
            name={lat !== null ? 'location' : 'locate-outline'}
            size={20}
            color={lat !== null ? '#34C759' : '#06B6D4'}
          />
          <Text style={[styles.locationButtonText, lat !== null && styles.locationButtonTextActive]}>
            {fetchingLocation
              ? 'Getting location…'
              : lat !== null
              ? `Coordinates captured (${lat.toFixed(4)}, ${lng?.toFixed(4)})`
              : 'Use Current Location (for map)'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.locationHint}>
          Used for showing your event on the map. Fill in the address manually above.
        </Text>
      </KeyboardAwareScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={['#8B2BE2', '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Date Pickers */}
      <DatePicker
        modal
        open={startPickerOpen}
        date={startTime}
        minimumDate={new Date()}
        onConfirm={(date) => { setStartPickerOpen(false); setStartTime(date); if (endTime <= date) setEndTime(new Date(date.getTime() + 3 * 60 * 60 * 1000)); }}
        onCancel={() => setStartPickerOpen(false)}
        theme="dark"
        title="Select Start Date & Time"
        confirmText="Set"
        cancelText="Cancel"
      />
      <DatePicker
        modal
        open={endPickerOpen}
        date={endTime}
        minimumDate={startTime}
        onConfirm={(date) => { setEndPickerOpen(false); setEndTime(date); }}
        onCancel={() => setEndPickerOpen(false)}
        theme="dark"
        title="Select End Date & Time"
        confirmText="Set"
        cancelText="Cancel"
      />
    </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 11, 30, 0.60)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  stepContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  stepWrapper: { flex: 1, alignItems: 'center', gap: 4 },
  stepBar: { height: 3, width: '100%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  stepBarActive: { backgroundColor: '#8B2BE2' },
  stepText: { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.40)' },
  stepTextActive: { color: '#FFFFFF', fontFamily: 'Inter-SemiBold' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  stepTitle: { fontSize: 28, fontFamily: 'Inter-Bold', color: '#FFFFFF', marginBottom: 8 },
  stepSubtitle: { fontSize: 15, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.55)', marginBottom: 24, lineHeight: 22 },
  field: { marginBottom: 20 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  required: { color: '#22D3EE' },
  datePicker: {
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateText: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#FFFFFF' },
  input: {
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  textarea: {
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    minHeight: 110,
  },
  inputError: { borderColor: '#FF5252' },
  errorText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#FF5252', marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 20 },
  locationButton: {
    minHeight: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  locationButtonActive: { borderColor: '#34C759', backgroundColor: 'rgba(52, 199, 89, 0.10)' },
  locationButtonText: { fontSize: 15, fontFamily: 'Inter-Regular', color: '#06B6D4', flex: 1 },
  locationButtonTextActive: { color: '#34C759', fontFamily: 'Inter-SemiBold' },
  locationHint: { fontSize: 12, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)', marginBottom: 8, lineHeight: 18 },
  footer: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: 'transparent' },
  nextButton: {
    height: 54,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
});

export default CreateEventStep2Screen;
