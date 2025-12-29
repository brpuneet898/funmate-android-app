/**
 * LIVENESS VERIFICATION SCREEN - Active Liveness Detection
 * 
 * This screen implements ACTIVE liveness detection with real-time face tracking.
 * Users must complete random head movement challenges to prove they're a real person.
 * 
 * SECURITY: This prevents spoofing attacks like:
 * - Photo of a photo
 * - Video playback
 * - 3D masks
 * - Deepfakes
 * 
 * CURRENT STATE: UI flow complete, ML model placeholders ready
 * PRODUCTION REQUIREMENT: Integrate ML model for actual liveness detection
 * 
 * ML INTEGRATION OPTIONS:
 * 1. AWS Rekognition Face Liveness (Recommended) - $0.10/check
 * 2. Google ML Kit Face Detection + Custom liveness logic
 * 3. iProov SDK
 * 4. FaceTec ZoOm
 * 5. Custom TensorFlow Lite models
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import Svg, { Circle, Path } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.8; // 80% of screen width

// Challenge types for liveness detection
type Challenge = 'CENTER' | 'TURN_LEFT' | 'TURN_RIGHT' | 'SMILE';

interface LivenessVerificationScreenProps {
  navigation: any;
}

const LivenessVerificationScreen: React.FC<LivenessVerificationScreenProps> = ({ navigation }) => {
  // Camera permissions
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const camera = useRef<Camera>(null);

  // State management
  const [isActive, setIsActive] = useState(true);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge>('CENTER');
  const [challengesCompleted, setChallengesCompleted] = useState<Challenge[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [faceDetected, setFaceDetected] = useState(false);

  // Animation for circle overlay
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Fisher-Yates shuffle for reliable randomization (prevents replay attacks)
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Random challenge sequence with all 4 unique challenges
  const challengeSequence = useRef<Challenge[]>(
    shuffleArray(['CENTER', 'TURN_LEFT', 'TURN_RIGHT', 'SMILE'] as Challenge[])
  );

  useEffect(() => {
    // Request camera permission on mount
    if (!hasPermission) {
      requestPermission();
    }

    // Pulse animation for circle overlay
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      setIsActive(false);
    };
  }, []);

  /**
   * 🚨 ML MODEL INTEGRATION POINT #1: FACE DETECTION 🚨
   * 
   * CURRENT: Placeholder that simulates face detection
   * PRODUCTION: Use real ML model to detect face in frame
   * 
   * OPTIONS:
   * 1. Google ML Kit Face Detection:
   *    - React Native wrapper: @react-native-ml-kit/face-detection
   *    - Detects face landmarks (468 points)
   *    - Returns face bounds, rotation angles
   * 
   * 2. TensorFlow Lite (Blazeface):
   *    - Lightweight on-device detection
   *    - Fast enough for real-time (30fps)
   * 
   * 3. Vision Camera Frame Processor:
   *    - Process frames in native code
   *    - Can run any ML model
   * 
   * EXPECTED INPUT: Camera frame (image data)
   * EXPECTED OUTPUT: {
   *   faceDetected: boolean,
   *   faceBounds: { x, y, width, height },
   *   headRotation: { yaw, pitch, roll },
   *   landmarks: { leftEye, rightEye, nose, mouth, etc. }
   * }
   */
  const detectFaceInFrame = async () => {
    // 🚨 PLACEHOLDER: Replace with actual ML model
    // Simulating face detection for UI testing
    const mockDetection = {
      faceDetected: true,
      faceBounds: { x: 0.2, y: 0.3, width: 0.6, height: 0.6 },
      headRotation: { yaw: 0, pitch: 0, roll: 0 }, // Degrees
      isInCircle: Math.random() > 0.3, // Mock: face is in circle 70% of time
    };

    setFaceDetected(mockDetection.faceDetected && mockDetection.isInCircle);
    return mockDetection;
  };

  /**
   * 🚨 ML MODEL INTEGRATION POINT #2: CHALLENGE VALIDATION 🚨
   * 
   * CURRENT: Placeholder that auto-passes challenges after delay
   * PRODUCTION: Use ML model to verify user performed the action
   * 
   * CHALLENGE VALIDATION LOGIC:
   * 
   * 1. CENTER: Face centered in circle
   *    - Check: faceBounds center matches circle center (±10% tolerance)
   * 
   * 2. TURN_LEFT: Head rotates left
   *    - Check: headRotation.yaw > 20 degrees (user's left)
   * 
   * 3. TURN_RIGHT: Head rotates right
   *    - Check: headRotation.yaw < -20 degrees (user's right)
   * 
   * 4. SMILE: Detect smile
   *    - Check: mouth landmarks show smile probability > 0.7
   *    - OR: Use ML Kit's smiling probability
   * 
   * ANTI-SPOOFING CHECKS:
   * - Texture analysis (detect printed photos)
   * - Depth estimation (detect flat surfaces)
   * - Motion consistency (smooth movement, not jumpy video)
   * - Liveness score (combine multiple signals)
   * 
   * EXPECTED INPUT: Camera frames + face landmarks
   * EXPECTED OUTPUT: {
   *   challengePassed: boolean,
   *   confidence: number (0-1),
   *   livenessScore: number (0-1),
   *   spoofingDetected: boolean
   * }
   */
  const validateChallenge = async (challenge: Challenge): Promise<boolean> => {
    // 🚨 PLACEHOLDER: Replace with actual ML validation
    // Simulating challenge validation for UI testing

    console.log(`🔍 Validating challenge: ${challenge}`);

    // Simulate processing time (real ML would take 100-500ms per frame)
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1500));

    // Mock validation (always passes in testing)
    // In production, this would analyze face landmarks and movements
    const mockValidation = {
      challengePassed: true,
      confidence: 0.95,
      livenessScore: 0.92,
      spoofingDetected: false,
    };

    console.log(`✅ Challenge validation result:`, mockValidation);
    return mockValidation.challengePassed;
  };

  /**
   * Process frame from camera (called continuously)
   * In production, this would run ML model on every frame
   */
  useEffect(() => {
    if (!isActive || isProcessing) return;

    const interval = setInterval(() => {
      detectFaceInFrame();
    }, 500); // Check face position twice per second

    return () => clearInterval(interval);
  }, [isActive, isProcessing]);

  /**
   * Move to next challenge when current one completes
   */
  const handleChallengeComplete = async () => {
    setIsProcessing(true);

    // Validate current challenge with ML model
    const passed = await validateChallenge(currentChallenge);

    if (passed) {
      // Mark challenge as completed
      setChallengesCompleted(prev => [...prev, currentChallenge]);

      // Check if all challenges are done
      const completedCount = challengesCompleted.length + 1;
      if (completedCount >= challengeSequence.current.length) {
        // All challenges completed - verify liveness
        await performFinalVerification();
      } else {
        // Move to next challenge
        const nextChallenge = challengeSequence.current[completedCount];
        setCurrentChallenge(nextChallenge);
        setIsProcessing(false);

        Toast.show({
          type: 'success',
          text1: 'Great!',
          text2: getInstructionText(nextChallenge),
          visibilityTime: 2000,
        });
      }
    } else {
      // Challenge failed
      setIsProcessing(false);
      handleVerificationFailure();
    }
  };

  /**
   * 🚨 ML MODEL INTEGRATION POINT #3: FINAL LIVENESS VERIFICATION 🚨
   * 
   * CURRENT: Auto-passes verification (testing mode)
   * PRODUCTION: Send collected data to ML model for final liveness check
   * 
   * FINAL VERIFICATION PROCESS:
   * 
   * 1. Collect all frames from challenges
   * 2. Analyze movement consistency across frames
   * 3. Run anti-spoofing algorithms:
   *    - Texture analysis
   *    - Depth estimation
   *    - Motion flow analysis
   *    - Face quality checks
   * 4. Calculate overall liveness score
   * 5. Compare live face to uploaded photos
   * 
   * RECOMMENDED APPROACH (AWS Rekognition):
   * const response = await fetch('YOUR_BACKEND_ENDPOINT/verify-liveness', {
   *   method: 'POST',
   *   headers: { 'Content-Type': 'application/json' },
   *   body: JSON.stringify({
   *     sessionId: 'unique-session-id',
   *     userId: auth.currentUser?.uid,
   *     // Frames captured during challenges
   *     frames: capturedFrames,
   *   })
   * });
   * 
   * const result = await response.json();
   * // result = { isLive: true, confidence: 0.98, matchesPhotos: true }
   * 
   * ALTERNATIVE (On-Device):
   * - Run TensorFlow Lite model locally
   * - Process frames in Vision Camera frame processor
   * - Faster but less secure than cloud-based
   * 
   * EXPECTED OUTPUT: {
   *   isLive: boolean,
   *   confidence: number,
   *   matchesPhotos: boolean,
   *   livenessScore: number
   * }
   */
  const performFinalVerification = async () => {
    try {
      setIsProcessing(true);

      // 🚨 PLACEHOLDER: Replace with actual ML model verification
      console.log('🔐 Performing final liveness verification...');

      // Simulate ML processing time
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));

      // Mock verification result (TESTING ONLY - always passes)
      const verificationResult = {
        isLive: true,
        confidence: 0.96,
        matchesPhotos: true,
        livenessScore: 0.94,
        spoofingAttemptDetected: false,
      };

      console.log('✅ Verification result:', verificationResult);

      if (verificationResult.isLive && verificationResult.matchesPhotos) {
        // SUCCESS: Update database
        await updateDatabaseOnSuccess(verificationResult);
        
        Toast.show({
          type: 'success',
          text1: 'Verification Successful! 🎉',
          text2: 'Your identity has been verified',
          visibilityTime: 3000,
        });

        // Navigate to next screen after delay
        setTimeout(() => {
          // Navigate to Interests Selection screen
          navigation.navigate('InterestsSelection' as never);
        }, 2000);

      } else {
        // FAILED: Liveness check failed
        handleVerificationFailure();
      }

    } catch (error: any) {
      console.error('❌ Verification error:', error);
      handleVerificationFailure();
    }
  };

  /**
   * Update Firestore on successful verification
   * Creates verification record and updates account/user status
   */
  const updateDatabaseOnSuccess = async (result: any) => {
    const userId = auth().currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const batch = firestore().batch();

    // 1. Create verification record
    const verificationRef = firestore().collection('verifications').doc();
    batch.set(verificationRef, {
      accountId: userId,
      type: 'face_liveness_active', // Different from static selfie
      status: 'approved',
      confidenceScore: result.confidence,
      livenessScore: result.livenessScore,
      provider: 'custom', // Or 'aws_rekognition', 'iproov', etc.
      timestamp: new Date(),
      metadata: {
        challenges: challengeSequence.current,
        attemptsUsed: 6 - attemptsLeft,
      },
    });

    // 2. Update accounts collection
    const accountRef = firestore().collection('accounts').doc(userId);
    batch.update(accountRef, {
      identityVerified: true,
      verificationMethod: 'active_liveness',
      verifiedAt: new Date(),
    });

    // 3. Update users collection
    const userRef = firestore().collection('users').doc(userId);
    batch.update(userRef, {
      isVerified: true,
    });

    await batch.commit();
    console.log('✅ Database updated successfully');
  };

  /**
   * Handle verification failure
   */
  const handleVerificationFailure = () => {
    const newAttemptsLeft = attemptsLeft - 1;
    setAttemptsLeft(newAttemptsLeft);
    setIsProcessing(false);

    if (newAttemptsLeft <= 0) {
      // No attempts left
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: 'Maximum attempts reached. Please contact support.',
        visibilityTime: 5000,
      });
      setTimeout(() => navigation.goBack(), 3000);
    } else {
      // Reset for retry
      setChallengesCompleted([]);
      setCurrentChallenge(challengeSequence.current[0]);
      
      Toast.show({
        type: 'error',
        text1: 'Verification Failed',
        text2: `${newAttemptsLeft} attempt${newAttemptsLeft !== 1 ? 's' : ''} remaining`,
        visibilityTime: 4000,
      });
    }
  };

  /**
   * Get instruction text for current challenge
   */
  const getInstructionText = (challenge: Challenge): string => {
    switch (challenge) {
      case 'CENTER':
        return 'Center your face in the circle';
      case 'TURN_LEFT':
        return 'Slowly turn your head to the left';
      case 'TURN_RIGHT':
        return 'Slowly turn your head to the right';
      case 'SMILE':
        return 'Smile for the camera';
      default:
        return '';
    }
  };

  /**
   * Get icon for current challenge
   */
  const getChallengeIcon = (challenge: Challenge): string => {
    switch (challenge) {
      case 'CENTER':
        return 'scan-circle';
      case 'TURN_LEFT':
        return 'arrow-back-circle';
      case 'TURN_RIGHT':
        return 'arrow-forward-circle';
      case 'SMILE':
        return 'happy';
      default:
        return 'scan';
    }
  };

  // Handle permission denied
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={80} color="#FF4458" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need camera access to verify your identity
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Handle no camera device
  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No camera device found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Camera Preview (Full Screen) */}
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive && !isProcessing}
        photo={true}
      />

      {/* Dark Overlay with Circle Cutout */}
      <View style={styles.overlay}>
        <Svg height={height} width={width}>
          {/* Dark overlay mask */}
          <Path
            d={`M0,0 L${width},0 L${width},${height} L0,${height} Z M${width/2},${height * 0.55 + CIRCLE_SIZE/2} a${CIRCLE_SIZE/2},${CIRCLE_SIZE/2} 0 1,0 0,-${CIRCLE_SIZE} a${CIRCLE_SIZE/2},${CIRCLE_SIZE/2} 0 1,0 0,${CIRCLE_SIZE}`}
            fill="rgba(0,0,0,0.7)"
            fillRule="evenodd"
          />
          {/* Circle outline */}
          <Circle
            cx={width / 2}
            cy={height * 0.55}
            r={CIRCLE_SIZE / 2}
            stroke={faceDetected ? '#4CAF50' : '#FF4458'}
            strokeWidth={4}
            fill="none"
          />
        </Svg>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Instruction Card */}
      <View style={styles.instructionCard}>
        <Ionicons 
          name={getChallengeIcon(currentChallenge)} 
          size={40} 
          color="#FF4458" 
        />
        <Text style={styles.instructionText}>
          {getInstructionText(currentChallenge)}
        </Text>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {challengeSequence.current.map((challenge, index) => (
            <View
              key={index}
              style={[
                styles.progressDot,
                challengesCompleted.includes(challenge) && styles.progressDotCompleted,
                currentChallenge === challenge && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      </View>

      {/* Auto-capture button (triggered when face is properly positioned) */}
      {faceDetected && !isProcessing && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.captureButton}
            onPress={handleChallengeComplete}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
            <Text style={styles.captureButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Processing Indicator */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.processingText}>Verifying...</Text>
        </View>
      )}

      {/* Attempts Counter */}
      <View style={styles.attemptsContainer}>
        <Text style={styles.attemptsText}>
          {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining
        </Text>
      </View>

      {/* Testing Warning */}
      <View style={styles.warningContainer}>
        <Text style={styles.warningText}>
          ⚠️ TESTING MODE: ML model integration required for production
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 40,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  backButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
  },
  instructionCard: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  instructionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 12,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 8,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E0E0E0',
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressDotActive: {
    backgroundColor: '#FF4458',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  actionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4458',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  captureButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  processingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  attemptsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  attemptsText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  warningContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255,196,0,0.9)',
    padding: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  warningText: {
    color: '#1A1A1A',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#FF4458',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LivenessVerificationScreen;
