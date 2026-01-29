/**
 * WHO LIKED YOU FILTER MODAL
 * 
 * Comprehensive filtering interface for "Who Liked You" section
 * Filters: Age, Height, Relationship Intent, Distance, Occupation, Trust Score, Match Score
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { WhoLikedYouFilters, DEFAULT_FILTERS, RELATIONSHIP_INTENT_OPTIONS } from '../types/filters';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  filters: WhoLikedYouFilters;
  onApplyFilters: (filters: WhoLikedYouFilters) => void;
  availableOccupations: string[]; // List of unique occupations from likers
}

const WhoLikedYouFilterModal: React.FC<Props> = ({
  visible,
  onClose,
  filters,
  onApplyFilters,
  availableOccupations,
}) => {
  // Local state for editing filters
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(60);
  const [heightMin, setHeightMin] = useState(100);
  const [heightMax, setHeightMax] = useState(300);
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [maxDistance, setMaxDistance] = useState(100);
  const [selectedOccupations, setSelectedOccupations] = useState<string[]>([]);
  const [occupationSearch, setOccupationSearch] = useState('');
  const [trustScoreMin, setTrustScoreMin] = useState(0);
  const [trustScoreMax, setTrustScoreMax] = useState(100);
  const [matchScoreMin, setMatchScoreMin] = useState(0);
  const [matchScoreMax, setMatchScoreMax] = useState(100);

  // Initialize from filters prop
  useEffect(() => {
    if (filters.ageRange) {
      setAgeMin(filters.ageRange.min);
      setAgeMax(filters.ageRange.max);
    } else {
      setAgeMin(18);
      setAgeMax(60);
    }

    if (filters.heightRange) {
      setHeightMin(filters.heightRange.min);
      setHeightMax(filters.heightRange.max);
    } else {
      setHeightMin(100);
      setHeightMax(300);
    }

    setSelectedIntents(filters.relationshipIntent || []);
    setMaxDistance(filters.maxDistance || 100);
    setSelectedOccupations(filters.occupations || []);

    if (filters.trustScoreRange) {
      setTrustScoreMin(filters.trustScoreRange.min);
      setTrustScoreMax(filters.trustScoreRange.max);
    } else {
      setTrustScoreMin(0);
      setTrustScoreMax(100);
    }

    if (filters.matchScoreRange) {
      setMatchScoreMin(filters.matchScoreRange.min);
      setMatchScoreMax(filters.matchScoreRange.max);
    } else {
      setMatchScoreMin(0);
      setMatchScoreMax(100);
    }
  }, [filters, visible]);

  const toggleIntent = (intent: string) => {
    setSelectedIntents(prev =>
      prev.includes(intent)
        ? prev.filter(i => i !== intent)
        : [...prev, intent]
    );
  };

  const toggleOccupation = (occupation: string) => {
    setSelectedOccupations(prev =>
      prev.includes(occupation)
        ? prev.filter(o => o !== occupation)
        : [...prev, occupation]
    );
  };

  const handleApply = () => {
    const newFilters: WhoLikedYouFilters = {
      ageRange: ageMin !== 18 || ageMax !== 60 ? { min: ageMin, max: ageMax } : null,
      heightRange: heightMin !== 100 || heightMax !== 300 ? { min: heightMin, max: heightMax } : null,
      relationshipIntent: selectedIntents.length > 0 ? selectedIntents : null,
      maxDistance: maxDistance !== 100 ? maxDistance : null,
      occupations: selectedOccupations.length > 0 ? selectedOccupations : null,
      trustScoreRange: trustScoreMin !== 0 || trustScoreMax !== 100 ? { min: trustScoreMin, max: trustScoreMax } : null,
      matchScoreRange: matchScoreMin !== 0 || matchScoreMax !== 100 ? { min: matchScoreMin, max: matchScoreMax } : null,
    };

    onApplyFilters(newFilters);
    onClose();
  };

  const handleClearAll = () => {
    setAgeMin(18);
    setAgeMax(60);
    setHeightMin(100);
    setHeightMax(300);
    setSelectedIntents([]);
    setMaxDistance(100);
    setSelectedOccupations([]);
    setOccupationSearch('');
    setTrustScoreMin(0);
    setTrustScoreMax(100);
    setMatchScoreMin(0);
    setMatchScoreMax(100);
    
    // Apply default filters immediately
    onApplyFilters(DEFAULT_FILTERS);
  };

  const filteredOccupations = availableOccupations.filter(occ =>
    occ.toLowerCase().includes(occupationSearch.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter Who Liked You</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Filters */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Age Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Age Range</Text>
              <Text style={styles.rangeValue}>{ageMin} - {ageMax} years</Text>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Min: {ageMin}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={60}
                  step={1}
                  value={ageMin}
                  onValueChange={setAgeMin}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Max: {ageMax}</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={18}
                  maximumValue={60}
                  step={1}
                  value={ageMax}
                  onValueChange={setAgeMax}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
            </View>

            {/* Height Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Height Range</Text>
              <Text style={styles.rangeValue}>{heightMin} - {heightMax} cm</Text>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Min: {heightMin} cm</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={100}
                  maximumValue={300}
                  step={1}
                  value={heightMin}
                  onValueChange={setHeightMin}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Max: {heightMax} cm</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={100}
                  maximumValue={300}
                  step={1}
                  value={heightMax}
                  onValueChange={setHeightMax}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
            </View>

            {/* Relationship Intent */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Relationship Intent</Text>
              <View style={styles.chipsContainer}>
                {RELATIONSHIP_INTENT_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.chip,
                      selectedIntents.includes(option.value) && styles.chipSelected,
                    ]}
                    onPress={() => toggleIntent(option.value)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedIntents.includes(option.value) && styles.chipTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Maximum Distance</Text>
              <Text style={styles.rangeValue}>Within {maxDistance} km</Text>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={maxDistance}
                onValueChange={setMaxDistance}
                minimumTrackTintColor="#FF4458"
                maximumTrackTintColor="#E0E0E0"
                thumbTintColor="#FF4458"
              />
            </View>

            {/* Occupation */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Occupation</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search occupations..."
                value={occupationSearch}
                onChangeText={setOccupationSearch}
                placeholderTextColor="#999999"
              />
              <ScrollView style={styles.occupationList} nestedScrollEnabled>
                {filteredOccupations.length > 0 ? (
                  filteredOccupations.map(occ => (
                    <TouchableOpacity
                      key={occ}
                      style={[
                        styles.occupationItem,
                        selectedOccupations.includes(occ) && styles.occupationItemSelected,
                      ]}
                      onPress={() => toggleOccupation(occ)}
                    >
                      <Text
                        style={[
                          styles.occupationText,
                          selectedOccupations.includes(occ) && styles.occupationTextSelected,
                        ]}
                      >
                        {occ}
                      </Text>
                      {selectedOccupations.includes(occ) && (
                        <Ionicons name="checkmark-circle" size={20} color="#FF4458" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No occupations available</Text>
                )}
              </ScrollView>
              {selectedOccupations.length > 0 && (
                <Text style={styles.selectedCount}>{selectedOccupations.length} selected</Text>
              )}
            </View>

            {/* Trust Score Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Trust Score (Profile Completeness)</Text>
              <Text style={styles.rangeValue}>{trustScoreMin}% - {trustScoreMax}%</Text>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Min: {trustScoreMin}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={trustScoreMin}
                  onValueChange={setTrustScoreMin}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Max: {trustScoreMax}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={trustScoreMax}
                  onValueChange={setTrustScoreMax}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
            </View>

            {/* Match Score Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Match Score</Text>
              <Text style={styles.rangeValue}>{matchScoreMin}% - {matchScoreMax}%</Text>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Min: {matchScoreMin}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={matchScoreMin}
                  onValueChange={setMatchScoreMin}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
              <View style={styles.doubleSliderContainer}>
                <Text style={styles.sliderLabel}>Max: {matchScoreMax}%</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  step={5}
                  value={matchScoreMax}
                  onValueChange={setMatchScoreMax}
                  minimumTrackTintColor="#FF4458"
                  maximumTrackTintColor="#E0E0E0"
                  thumbTintColor="#FF4458"
                />
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  filterSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  rangeValue: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  doubleSliderContainer: {
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#FF4458',
    borderColor: '#FF4458',
  },
  chipText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  occupationList: {
    maxHeight: 150,
  },
  occupationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#F8F8F8',
  },
  occupationItemSelected: {
    backgroundColor: '#FFF0F1',
  },
  occupationText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  occupationTextSelected: {
    color: '#FF4458',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  selectedCount: {
    fontSize: 12,
    color: '#FF4458',
    marginTop: 8,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 20,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4458',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4458',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FF4458',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default WhoLikedYouFilterModal;
