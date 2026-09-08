import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onAnimationComplete?: () => void;
}

export default function SplashScreen({ onAnimationComplete }: SplashScreenProps) {
  const videoRef = useRef<Video>(null);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded && status.didJustFinish) {
      onAnimationComplete?.();
    }
  }, [onAnimationComplete]);

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../assets/Boot Logo.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Fond de la video de lancement : evite un flash creme avant sa premiere
    // image. La video est en COVER, donc cette couleur ne se voit qu'a ce
    // moment-la.
    backgroundColor: '#A6C58A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  video: {
    width: width,
    height: height,
    position: 'absolute',
  },
});
