/**
 * CUSTOM CARD SWIPER COMPONENT
 * 
 * Simple, reliable card swiper using PanResponder
 * Built specifically for Funmate to avoid third-party library issues
 * 
 * IMPORTANT: Parent component should filter out swiped cards from the data array.
 * This component always shows data[0] as the top card.
 */

import React, { useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_OUT_DURATION = 250;

interface CardSwiperProps {
  data: any[];
  renderCard: (item: any, index: number) => React.ReactElement | null;
  onSwipeRight?: (index: number) => void;
  onSwipeLeft?: (index: number) => void;
  onSwipedAll?: () => void;
  cardStyle?: any;
  stackSize?: number;
}

export const CardSwiper: React.FC<CardSwiperProps> = ({
  data,
  renderCard,
  onSwipeRight,
  onSwipeLeft,
  onSwipedAll,
  cardStyle,
  stackSize = 3,
}) => {
  // Use refs to avoid stale closures in PanResponder
  const position = useRef(new Animated.ValueXY()).current;
  const isSwipingRef = useRef(false);
  const callbacksRef = useRef({ onSwipeRight, onSwipeLeft, onSwipedAll });
  const dataRef = useRef(data);

  // Keep refs updated on every render
  callbacksRef.current = { onSwipeRight, onSwipeLeft, onSwipedAll };
  dataRef.current = data;

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const handleSwipeComplete = (direction: 'right' | 'left') => {
    const { onSwipeRight, onSwipeLeft, onSwipedAll } = callbacksRef.current;
    const currentData = dataRef.current;

    // Always index 0 - parent will filter the array
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight(0);
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft(0);
    }

    // Check if this was the last card
    if (currentData.length <= 1 && onSwipedAll) {
      onSwipedAll();
    }

    // Reset for next card
    position.setValue({ x: 0, y: 0 });
    isSwipingRef.current = false;
  };

  const forceSwipe = (direction: 'right' | 'left') => {
    if (isSwipingRef.current) return;
    isSwipingRef.current = true;

    const x = direction === 'right' ? width + 100 : -width - 100;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => handleSwipeComplete(direction));
  };

  // Create PanResponder once, use refs for current values
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isSwipingRef.current,
        onPanResponderMove: (_, gesture) => {
          if (!isSwipingRef.current) {
            position.setValue({ x: gesture.dx, y: gesture.dy });
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (isSwipingRef.current) return;

          if (gesture.dx > SWIPE_THRESHOLD) {
            forceSwipe('right');
          } else if (gesture.dx < -SWIPE_THRESHOLD) {
            forceSwipe('left');
          } else {
            resetPosition();
          }
        },
      }),
    []
  );

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-width * 1.5, 0, width * 1.5],
      outputRange: ['-30deg', '0deg', '30deg'],
    });

    return {
      transform: [
        { translateX: position.x },
        { translateY: position.y },
        { rotate },
      ],
    };
  };

  const getLikeOpacity = () => {
    return position.x.interpolate({
      inputRange: [0, SWIPE_THRESHOLD],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  const getNopeOpacity = () => {
    return position.x.interpolate({
      inputRange: [-SWIPE_THRESHOLD, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const renderCards = () => {
    if (data.length === 0) {
      return null;
    }

    return data
      .slice(0, stackSize)
      .map((item, i) => {
        if (i === 0) {
          // Top card - draggable
          return (
            <Animated.View
              key={item.id || `card-${i}`}
              style={[styles.card, getCardStyle(), cardStyle]}
              {...panResponder.panHandlers}
            >
              {renderCard(item, i)}
            </Animated.View>
          );
        }

        // Stack cards behind
        return (
          <Animated.View
            key={item.id || `card-${i}`}
            style={[
              styles.card,
              {
                top: 10 * i,
                transform: [{ scale: 1 - 0.05 * i }],
                opacity: 1 - 0.2 * i,
              },
              cardStyle,
            ]}
          >
            {renderCard(item, i)}
          </Animated.View>
        );
      })
      .reverse();
  };

  return (
    <View style={styles.container}>
      {renderCards()}

      {/* Like Overlay (Heart - Right Side) */}
      {data.length > 0 && (
        <Animated.View
          style={[
            styles.overlayIcon,
            styles.likeOverlay,
            { opacity: getLikeOpacity() },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="heart" size={100} color="#FF4458" />
        </Animated.View>
      )}

      {/* Nope Overlay (Cross - Left Side) */}
      {data.length > 0 && (
        <Animated.View
          style={[
            styles.overlayIcon,
            styles.nopeOverlay,
            { opacity: getNopeOpacity() },
          ]}
          pointerEvents="none"
        >
          <Ionicons name="close-circle" size={100} color="#FF4458" />
        </Animated.View>
      )}
    </View>
  );
};

const CARD_WIDTH = width * 0.9;
const CARD_LEFT_MARGIN = (width - CARD_WIDTH) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    position: 'absolute',
    width: CARD_WIDTH,
    left: CARD_LEFT_MARGIN,
    top: 40,
  },
  overlayIcon: {
    position: 'absolute',
    top: '35%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  likeOverlay: {
    right: 50,
  },
  nopeOverlay: {
    left: 50,
  },
});

export default CardSwiper;
