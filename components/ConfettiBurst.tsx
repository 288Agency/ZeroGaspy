import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PARTICLE_COUNT = 20;
const DURATION = 800;
const COLORS = ['#FFD700', '#FF6B6B', '#4ADE80', '#60A5FA', '#F472B6', '#A78BFA', '#FB923C'];

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  shape: 'rect' | 'circle';
}

interface ConfettiBurstProps {
  visible: boolean;
  onDone?: () => void;
}

function createParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: new Animated.Value(SCREEN_W / 2),
    y: new Animated.Value(SCREEN_H * 0.35),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.random() * 6,
    shape: Math.random() > 0.5 ? 'rect' as const : 'circle' as const,
  }));
}

export default function ConfettiBurst({ visible, onDone }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!visible) {
      setParticles([]);
      return;
    }

    const ps = createParticles();
    setParticles(ps);

    const animations = ps.map((p) => {
      const destX = (Math.random() - 0.5) * SCREEN_W * 1.4 + SCREEN_W / 2;
      const destY = SCREEN_H * (0.1 + Math.random() * 0.7);
      const rotEnd = (Math.random() - 0.5) * 720;
      const delay = Math.random() * 80;

      return Animated.parallel([
        Animated.timing(p.x, {
          toValue: destX,
          duration: DURATION,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.y, {
            toValue: destY - 60 - Math.random() * 80,
            duration: DURATION * 0.4,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: destY + 120 + Math.random() * 100,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.rotate, {
          toValue: rotEnd,
          duration: DURATION,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.opacity, {
          toValue: 0,
          duration: DURATION * 0.3,
          delay: delay + DURATION * 0.7,
          useNativeDriver: true,
        }),
      ]);
    });

    const anim = Animated.parallel(animations);
    anim.start(() => onDoneRef.current?.());

    return () => anim.stop();
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (particles.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            p.shape === 'circle' ? styles.circle : styles.rect,
            {
              width: p.size,
              height: p.shape === 'rect' ? p.size * 0.6 : p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [-720, 720],
                    outputRange: ['-720deg', '720deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  rect: {
    position: 'absolute',
    borderRadius: 1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
  },
});
