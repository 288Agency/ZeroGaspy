import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Animated,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { List } from '../types';
import { RootStackParamList } from '../types/navigation';
import { loadLists } from '../utils/localStorage';
import { getDaysUntilExpiration } from '../utils/dateUtils';
import StatsCardsRow from '../components/StatsCardsRow';
import SpacesGrid from '../components/SpacesGrid';
import FeedbackModal from '../components/FeedbackModal';
import AcceptInvitationModal from '../components/AcceptInvitationModal';
import CreateOrJoinModal from '../components/CreateOrJoinModal';
import PressableScale from '../components/PressableScale';
import { COLORS, SHADOWS, TYPOGRAPHY, RADIUS, hexToRgba } from '../utils/designSystem';
import { scaleSize, scaleSpacing, scaleFontSize, isSmallScreen } from '../utils/responsive';
import { supabase } from '../config/supabase';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Animated background decoration
const BackgroundDecoration = React.memo(function BackgroundDecoration() {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 8000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  const rotate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '10deg'],
  });

  return (
    <Animated.View
      style={[
        styles.backgroundDecoration,
        {
          transform: [{ translateY }, { rotate }],
        },
      ]}
    >
      <Svg width={300} height={300} viewBox="0 0 300 300">
        <Defs>
          <LinearGradient id="blobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.primary[500]} stopOpacity="0.08" />
            <Stop offset="100%" stopColor={COLORS.secondary.sage} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Path
          d="M150,30 C220,30 270,80 270,150 C270,220 220,270 150,270 C80,270 30,220 30,150 C30,80 80,30 150,30"
          fill="url(#blobGrad)"
        />
        <Circle cx="80" cy="60" r="25" fill={COLORS.primary[500]} opacity="0.04" />
        <Circle cx="220" cy="240" r="35" fill={COLORS.secondary.sage} opacity="0.06" />
      </Svg>
    </Animated.View>
  );
});

// Logo component
const LogoSection = React.memo(function LogoSection() {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const logoSize = scaleSize(isSmallScreen ? 56 : 70);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.logoSection,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Logo image */}
      <View style={styles.logoIconContainer}>
        <Image
          source={require('../assets/logo.png')}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
          accessibilityLabel="Logo ZeroGaspy"
          accessibilityRole="image"
        />
      </View>

      {/* App name and greeting */}
      <View style={styles.logoTextContainer}>
        <Text style={styles.greeting}>Bonjour !</Text>
        <Text style={styles.appName}>ZeroGaspy</Text>
      </View>
    </Animated.View>
  );
});

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [lists, setLists] = useState<List[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [acceptInvitationModalVisible, setAcceptInvitationModalVisible] = useState(false);
  const [createOrJoinModalVisible, setCreateOrJoinModalVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Animations
  const headerFade = useRef(new Animated.Value(0)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentSlide = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    // Staggered entrance animation
    Animated.sequence([
      Animated.timing(headerFade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(contentFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(contentSlide, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
          tension: 40,
        }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    // Récupérer l'utilisateur actuel
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };
    getCurrentUser();
  }, []);

  const loadListsData = async () => {
    try {
      const data = await loadLists();
      setLists(data);
    } catch (error) {
      console.error('Erreur lors du chargement des listes:', error);
      Alert.alert(
        'Erreur',
        'Impossible de charger vos listes. Veuillez réessayer.',
        [{ text: 'OK' }]
      );
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadListsData();
    }, [])
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadListsData();
    setRefreshing(false);
  }, []);

  const expiringSoonCount = lists.reduce((sum, list) => {
    const expiringItems = list.items.filter((item) => {
      if (item.status === 'consumed' || item.status === 'thrown') return false;
      const days = getDaysUntilExpiration(item.expirationDate);
      return days !== null && days >= 0 && days <= 7;
    });
    return sum + expiringItems.length;
  }, 0);

  const thrownCount = lists.reduce((sum, list) => {
    const thrownItems = list.items.filter((item) => item.status === 'thrown');
    return sum + thrownItems.length;
  }, 0);

  return (
    <View style={styles.container}>
      {/* Background decoration */}
      <BackgroundDecoration />

      {/* Feedback button */}
      <Animated.View style={[styles.feedbackButton, { opacity: headerFade }]}>
        <PressableScale
          onPress={() => setFeedbackModalVisible(true)}
          style={styles.headerButton}
          hapticType="light"
          accessibilityLabel="Envoyer un feedback"
          accessibilityRole="button"
        >
          <Ionicons name="chatbubble-outline" size={scaleSize(isSmallScreen ? 18 : 22)} color={COLORS.primary[500]} />
        </PressableScale>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary[500]}
            colors={[COLORS.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Logo section */}
        <LogoSection />

        {/* Main content */}
        <Animated.View
          style={{
            opacity: contentFade,
            transform: [{ translateY: contentSlide }],
          }}
        >
          {/* Stats cards */}
          <StatsCardsRow
            expiringSoonCount={expiringSoonCount}
            thrownCount={thrownCount}
            onExpiringSoonPress={() => navigation.navigate('ExpiringSoon')}
            onThrownPress={() => navigation.navigate('ThrownFoods')}
          />

          {/* Spaces grid */}
          <SpacesGrid
            lists={lists}
            onCreateList={() => setCreateOrJoinModalVisible(true)}
            onListDeleted={loadListsData}
          />
        </Animated.View>
      </ScrollView>

      {/* Feedback modal */}
      <FeedbackModal
        visible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />

      {/* Accept invitation modal */}
      <AcceptInvitationModal
        visible={acceptInvitationModalVisible}
        onClose={() => setAcceptInvitationModalVisible(false)}
        userId={currentUserId}
        onSuccess={(listId) => {
          // Recharger les listes
          loadListsData();
        }}
      />

      {/* Create or join modal */}
      <CreateOrJoinModal
        visible={createOrJoinModalVisible}
        onClose={() => setCreateOrJoinModalVisible(false)}
        onCreateList={() => {
          setCreateOrJoinModalVisible(false);
          navigation.navigate('CreateList');
        }}
        onJoinList={() => {
          setCreateOrJoinModalVisible(false);
          setAcceptInvitationModalVisible(true);
        }}
        isAuthenticated={isAuthenticated}
      />
    </View>
  );
}

const headerButtonSize = scaleSize(isSmallScreen ? 40 : 48);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.secondary.cream,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: scaleSize(-40),
    right: scaleSize(-60),
    zIndex: 0,
  },
  feedbackButton: {
    position: 'absolute',
    top: scaleSpacing(isSmallScreen ? 44 : 56),
    right: scaleSpacing(isSmallScreen ? 14 : 20),
    zIndex: 50,
  },
  headerButtons: {
    position: 'absolute',
    flexDirection: 'row',
    gap: scaleSpacing(8),
    top: scaleSpacing(isSmallScreen ? 44 : 56),
    right: scaleSpacing(isSmallScreen ? 14 : 20),
    zIndex: 50,
  },
  headerButton: {
    width: headerButtonSize,
    height: headerButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: scaleSize(isSmallScreen ? 12 : 16),
    backgroundColor: hexToRgba(COLORS.secondary.sage, 0.6),
    borderWidth: 1,
    borderColor: hexToRgba(COLORS.primary[500], 0.15),
    ...SHADOWS.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: scaleSpacing(isSmallScreen ? 48 : 60),
    paddingBottom: scaleSpacing(isSmallScreen ? 100 : 120),
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleSpacing(isSmallScreen ? 16 : 24),
    paddingTop: scaleSpacing(isSmallScreen ? 10 : 16),
    paddingBottom: scaleSpacing(isSmallScreen ? 20 : 32),
  },
  logoIconContainer: {
    width: scaleSize(isSmallScreen ? 60 : 74),
    height: scaleSize(isSmallScreen ? 60 : 74),
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextContainer: {
    marginLeft: scaleSpacing(isSmallScreen ? 12 : 16),
  },
  greeting: {
    fontSize: scaleFontSize(isSmallScreen ? 12 : 14),
    lineHeight: scaleFontSize(isSmallScreen ? 16 : 20),
    fontWeight: '400',
    color: COLORS.text.secondary,
  },
  appName: {
    fontSize: scaleFontSize(isSmallScreen ? 26 : 32),
    lineHeight: scaleFontSize(isSmallScreen ? 32 : 40),
    fontWeight: '700',
    color: COLORS.primary[500],
    letterSpacing: -1,
  },
});
