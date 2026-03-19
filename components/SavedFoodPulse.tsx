import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STAR_COUNT = 8;
const CONFETTI_COUNT = 12;
const SPARK_COLORS = ['#FFD700', '#4ADE80', '#60A5FA', '#FB923C', '#F472B6', '#A78BFA', '#34D399'];

interface Star {
  x: Animated.Value;
  y: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  angle: number;
}

interface Confetto {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  width: number;
  height: number;
  startX: number;
  isCircle: boolean;
}

interface SavedFoodPulseProps {
  visible: boolean;
  onDone?: () => void;
}

function createStars(): Star[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const angle = (i / STAR_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    return {
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      size: 5 + Math.random() * 5,
      angle,
    };
  });
}

function createConfetti(): Confetto[] {
  return Array.from({ length: CONFETTI_COUNT }, () => {
    const startX = Math.random() * SCREEN_W;
    return {
      x: new Animated.Value(0),
      y: new Animated.Value(-30),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
      color: SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)],
      width: 6 + Math.random() * 6,
      height: 4 + Math.random() * 4,
      startX,
      isCircle: Math.random() > 0.6,
    };
  });
}

export default function SavedFoodPulse({ visible, onDone }: SavedFoodPulseProps) {
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.3)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const starsRef = useRef<Star[]>(createStars());
  const confettiRef = useRef<Confetto[]>(createConfetti());
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible) return;

    const stars = createStars();
    starsRef.current = stars;
    const confetti = createConfetti();
    confettiRef.current = confetti;

    checkScale.setValue(0);
    checkOpacity.setValue(1);
    ringScale.setValue(0.3);
    ringOpacity.setValue(0.8);
    ring2Scale.setValue(0.3);
    ring2Opacity.setValue(0.5);
    flashOpacity.setValue(0.35);

    const starAnims = stars.map((s) => {
      const dist = 55 + Math.random() * 40;
      const dx = Math.cos(s.angle) * dist;
      const dy = Math.sin(s.angle) * dist;
      const delay = Math.random() * 60;

      return Animated.parallel([
        Animated.timing(s.x, { toValue: dx, duration: 450, delay, useNativeDriver: true }),
        Animated.timing(s.y, { toValue: dy, duration: 450, delay, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(s.scale, { toValue: 1.2, duration: 150, delay, useNativeDriver: true }),
          Animated.timing(s.scale, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
        Animated.timing(s.opacity, { toValue: 0, duration: 400, delay: delay + 200, useNativeDriver: true }),
      ]);
    });

    const confettiAnims = confetti.map((c) => {
      const drift = (Math.random() - 0.5) * 60;
      const delay = Math.random() * 300;
      const fallDuration = 800 + Math.random() * 500;
      const destY = SCREEN_H * 0.7 + Math.random() * SCREEN_H * 0.3;
      const rotEnd = (Math.random() - 0.5) * 540;

      return Animated.parallel([
        Animated.timing(c.x, { toValue: drift, duration: fallDuration, delay, useNativeDriver: true }),
        Animated.timing(c.y, { toValue: destY, duration: fallDuration, delay, useNativeDriver: true }),
        Animated.timing(c.rotate, { toValue: rotEnd, duration: fallDuration, delay, useNativeDriver: true }),
        Animated.timing(c.opacity, { toValue: 0, duration: 300, delay: delay + fallDuration - 300, useNativeDriver: true }),
      ]);
    });

    const anim = Animated.parallel([
      Animated.timing(flashOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),

      Animated.spring(checkScale, {
        toValue: 1,
        friction: 3,
        tension: 180,
        useNativeDriver: true,
      }),
      Animated.timing(checkOpacity, { toValue: 0, duration: 250, delay: 500, useNativeDriver: true }),

      Animated.timing(ringScale, { toValue: 3, duration: 500, useNativeDriver: true }),
      Animated.timing(ringOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),

      Animated.sequence([
        Animated.delay(80),
        Animated.parallel([
          Animated.timing(ring2Scale, { toValue: 2.5, duration: 450, useNativeDriver: true }),
          Animated.timing(ring2Opacity, { toValue: 0, duration: 450, useNativeDriver: true }),
        ]),
      ]),

      ...starAnims,
      ...confettiAnims,
    ]);

    anim.start(() => onDoneRef.current?.());

    return () => anim.stop();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Background flash */}
      <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />

      {/* Confetti falling from top */}
      {confettiRef.current.map((c, i) => (
        <Animated.View
          key={`c${i}`}
          style={[
            c.isCircle ? styles.confettiCircle : styles.confettiRect,
            {
              top: 0,
              left: c.startX,
              width: c.width,
              height: c.isCircle ? c.width : c.height,
              backgroundColor: c.color,
              opacity: c.opacity,
              transform: [
                { translateX: c.x },
                { translateY: c.y },
                { rotate: c.rotate.interpolate({
                    inputRange: [-540, 540],
                    outputRange: ['-540deg', '540deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Rings */}
      <Animated.View
        style={[
          styles.ring,
          { borderColor: '#4ADE80', opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />
      <Animated.View
        style={[
          styles.ring,
          { borderColor: '#FFD700', opacity: ring2Opacity, transform: [{ scale: ring2Scale }] },
        ]}
      />

      {/* Sparks */}
      {starsRef.current.map((s, i) => (
        <Animated.View
          key={`s${i}`}
          style={[
            styles.star,
            {
              width: s.size,
              height: s.size,
              borderRadius: s.size / 2,
              backgroundColor: s.color,
              opacity: s.opacity,
              transform: [
                { translateX: Animated.add(s.x, SCREEN_W / 2 - s.size / 2) },
                { translateY: Animated.add(s.y, SCREEN_H / 2 - s.size / 2) },
                { scale: s.scale },
              ],
            },
          ]}
        />
      ))}

      {/* Checkmark circle */}
      <Animated.View
        style={[
          styles.circle,
          { opacity: checkOpacity, transform: [{ scale: checkScale }] },
        ]}
      >
        <Ionicons name="checkmark" size={38} color="#fff" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    elevation: 9998,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#4ADE80',
  },
  ring: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  star: {
    position: 'absolute',
  },
  confettiRect: {
    position: 'absolute',
    borderRadius: 1,
  },
  confettiCircle: {
    position: 'absolute',
    borderRadius: 999,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4ADE80',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4ADE80',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 12,
  },
});
