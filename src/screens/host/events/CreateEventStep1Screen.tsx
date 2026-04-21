/**
 * CREATE EVENT — STEP 1: BASIC DETAILS
 * Title, Description, Category, Tags, Visibility
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Modal,
  FlatList,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import LinearGradient from 'react-native-linear-gradient';

const EVENT_CATEGORIES = [
  { label: 'Music', icon: 'musical-notes-outline' },
  { label: 'Sports', icon: 'football-outline' },
  { label: 'Food & Drinks', icon: 'restaurant-outline' },
  { label: 'Nightlife', icon: 'moon-outline' },
  { label: 'Art & Culture', icon: 'color-palette-outline' },
  { label: 'Comedy', icon: 'happy-outline' },
  { label: 'Tech', icon: 'code-slash-outline' },
  { label: 'Fitness', icon: 'barbell-outline' },
  { label: 'Fashion', icon: 'shirt-outline' },
  { label: 'Gaming', icon: 'game-controller-outline' },
  { label: 'Travel', icon: 'airplane-outline' },
  { label: 'Business', icon: 'briefcase-outline' },
  { label: 'Social', icon: 'people-outline' },
  { label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];

export type Step1Data = {
  title: string;
  description: string;
  category: string;
  tags: string[];
};

const CreateEventStep1Screen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [categoryModal, setCategoryModal] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Event title is required';
    if (title.trim().length < 3) newErrors.title = 'Title must be at least 3 characters';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (!category) newErrors.category = 'Please select a category';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    const step1: Step1Data = {
      title: title.trim(),
      description: description.trim(),
      category,
      tags,
    };
    navigation.navigate('CreateEventStep2', { step1 });
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
            <View style={[styles.stepBar, step === 1 && styles.stepBarActive]} />
            <Text style={[styles.stepText, step === 1 && styles.stepTextActive]}>
              {step}
            </Text>
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
        <Text style={styles.stepTitle}>Basic Details</Text>
        <Text style={styles.stepSubtitle}>Tell people what your event is about</Text>

        {/* Title */}
        <View style={styles.field}>
          <Text style={styles.label}>Event Title <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.input, errors.title && styles.inputError]}
            placeholder="e.g. Summer Music Festival 2026"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={title}
            onChangeText={t => { setTitle(t); if (errors.title) setErrors(e => ({ ...e, title: '' })); }}
            maxLength={80}
          />
          {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}
          <Text style={styles.charCount}>{title.length}/80</Text>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={[styles.textarea, errors.description && styles.inputError]}
            placeholder="Describe your event, what to expect, dress code, etc."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={description}
            onChangeText={d => { setDescription(d); if (errors.description) setErrors(e => ({ ...e, description: '' })); }}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
          <Text style={styles.charCount}>{description.length}/1000</Text>
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity
            style={[styles.selector, errors.category && styles.inputError]}
            onPress={() => setCategoryModal(true)}
            activeOpacity={0.8}
          >
            {category ? (
              <View style={styles.selectorRow}>
                <Ionicons
                  name={EVENT_CATEGORIES.find(c => c.label === category)?.icon || 'help-outline'}
                  size={18}
                  color="#06B6D4"
                />
                <Text style={styles.selectorValue}>{category}</Text>
              </View>
            ) : (
              <Text style={styles.selectorPlaceholder}>Select a category</Text>
            )}
            <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
          {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
        </View>

        {/* Tags */}
        <View style={styles.field}>
          <Text style={styles.label}>Tags <Text style={styles.optional}>(optional)</Text></Text>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="e.g. outdoor, 18+"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              returnKeyType="done"
              maxLength={20}
            />
            <TouchableOpacity style={styles.addTagButton} onPress={addTag}>
              <Ionicons name="add" size={20} color="#06B6D4" />
            </TouchableOpacity>
          </View>
          {tags.length > 0 && (
            <View style={styles.tagChips}>
              {tags.map(tag => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={14} color="rgba(255,255,255,0.70)" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

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
      
      {/* Category Modal */}
      <Modal
        visible={categoryModal}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={EVENT_CATEGORIES}
              keyExtractor={item => item.label}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.categoryItem, category === item.label && styles.categoryItemActive]}
                  onPress={() => { setCategory(item.label); setCategoryModal(false); if (errors.category) setErrors(e => ({ ...e, category: '' })); }}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons name={item.icon} size={22} color={category === item.label ? '#FFFFFF' : '#06B6D4'} />
                  </View>
                  <Text style={[styles.categoryLabel, category === item.label && styles.categoryLabelActive]}>
                    {item.label}
                  </Text>
                  {category === item.label && (
                    <Ionicons name="checkmark" size={20} color="#06B6D4" />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCategoryModal(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  field: { marginBottom: 20, zIndex: 20, elevation: 2 },
  label: { fontSize: 13, fontFamily: 'Inter-Medium', color: 'rgba(255,255,255,0.55)', marginBottom: 8 },
  required: { color: '#22D3EE' },
  optional: { color: 'rgba(255,255,255,0.35)', fontFamily: 'Inter-Regular' },
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
    minHeight: 140,
  },
  inputError: { borderColor: '#FF5252' },
  errorText: { fontSize: 12, fontFamily: 'Inter-Regular', color: '#FF5252', marginTop: 4 },
  charCount: { fontSize: 11, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginTop: 6 },
  selector: {
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectorValue: { fontSize: 16, fontFamily: 'Inter-Regular', color: '#FFFFFF' },
  selectorPlaceholder: { fontSize: 16, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.35)' },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
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
  addTagButton: {
    width: 54,
    height: 54,
    backgroundColor: '#16112B',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 92, 246, 0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  tagChipText: { fontSize: 13, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: 'rgba(13, 11, 30, 0)',
  },
  nextButton: {
    height: 54,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: { fontSize: 17, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#1A1530',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
    opacity: 0.8,
  },
  modalTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold', color: '#FFFFFF', textAlign: 'center', marginBottom: 12, paddingHorizontal: 20 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  categoryItemActive: { backgroundColor: 'rgba(139, 92, 246, 0.18)' },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular', color: '#FFFFFF' },
  categoryLabelActive: { fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
  modalClose: { paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  modalCloseText: { fontSize: 15, fontFamily: 'Inter-SemiBold', color: '#22D3EE' },
});

export default CreateEventStep1Screen;
