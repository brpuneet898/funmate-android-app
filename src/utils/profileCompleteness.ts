/**
 * PROFILE COMPLETENESS CALCULATOR
 * 
 * Calculates profile completion percentage based on:
 * - Mandatory Section: 30% (phone, email, name, age, gender, photos, selfie)
 * - Bio: 10%
 * - Interests: 15%
 * - Dating Preferences: 20% (intent + gender preference)
 * - Location: 25%
 */

interface UserData {
  name?: string;
  age?: number;
  gender?: string;
  photos?: any[];
  isVerified?: boolean;
  bio?: string;
  interests?: string[];
  relationshipIntent?: string | null;
  interestedIn?: string[];
  location?: {
    latitude: number;
    longitude: number;
  } | null;
}

export const calculateProfileCompleteness = (userData: UserData): number => {
  let completeness = 0;

  // Mandatory Section: 30%
  // If user has name, age, gender, and photos, assume they completed signup
  // (phone verification and selfie check are required during signup)
  const hasMandatory = 
    userData.name &&
    userData.age &&
    userData.gender &&
    userData.photos && userData.photos.length >= 4;
  
  if (hasMandatory) {
    completeness += 30;
  }

  // Bio: 10%
  if (userData.bio && userData.bio.trim().length >= 20) {
    completeness += 10;
  }

  // Interests: 15%
  if (userData.interests && userData.interests.length > 0) {
    completeness += 15;
  }

  // Dating Preferences: 20% (10% each for intent and gender)
  if (userData.relationshipIntent) {
    completeness += 10;
  }
  if (userData.interestedIn && userData.interestedIn.length > 0) {
    completeness += 10;
  }

  // Location: 25%
  if (userData.location && userData.location.latitude && userData.location.longitude) {
    completeness += 25;
  }

  return Math.round(completeness);
};

export const getMissingFields = (userData: UserData): string[] => {
  const missing: string[] = [];

  if (!userData.bio || userData.bio.trim().length < 20) {
    missing.push('Bio');
  }
  if (!userData.interests || userData.interests.length === 0) {
    missing.push('Interests');
  }
  if (!userData.relationshipIntent) {
    missing.push('Relationship Intent');
  }
  if (!userData.interestedIn || userData.interestedIn.length === 0) {
    missing.push('Gender Preference');
  }
  if (!userData.location) {
    missing.push('Location');
  }

  return missing;
};
