import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    DeviceEventEmitter,
    Dimensions,
    Modal,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useLocalization } from '../useLocalization';

const { width } = Dimensions.get('window');
const STORAGE_KEY = 'daily_hits';
const UNSAVED_COUNT_STORAGE_KEY = 'unsaved_hit_data';

// ✅ NEW: Map of music keys to their assets
const musicMap = {
  'dabeizhou.mp3': require('../../assets/music/dabeizhou.mp3'),
  'guanshiyin.mp3': require('../../assets/music/guanshiyin.mp3'),
};

interface HitRecord {
  timestamp: number;
  count: number;
}

interface DailyHits {
  total: number;
  hits: HitRecord[];
}

interface AllHitsData {
  [date: string]: DailyHits;
}

interface UnsavedHitData {
  count: number;
  date: string;
}


export default function Index() {
  const { t } = useLocalization();
  const [count, setCount] = useState(0);
  const [autoHitEnabled, setAutoHitEnabled] = useState(false);
  const [frequency, setFrequency] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [bgColor, setBgColor] = useState('#000000');
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [showMusicButton, setShowMusicButton] = useState(false);
  const [showCounter, setShowCounter] = useState(true);
  const [disarrayEnabled, setDisarrayEnabled] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState('dabeizhou.mp3'); // ✅ NEW
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slideAnim = useRef(new Animated.Value(150)).current;
  const musicRef = useRef<Audio.Sound | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const modalScaleAnim = useRef(new Animated.Value(0.5)).current;


  useFocusEffect(
    useCallback(() => {
      const loadAndCheckUnsavedCount = async () => {
        const today = new Date().toISOString().split('T')[0];
        const storedUnsaved = await AsyncStorage.getItem(UNSAVED_COUNT_STORAGE_KEY);
        const unsavedData: UnsavedHitData | null = storedUnsaved ? JSON.parse(storedUnsaved) : null;
  
        if (unsavedData && unsavedData.count > 0) {
          if (unsavedData.date === today) {
            setCount(unsavedData.count);
          } else {
            console.log(`Auto-saving ${unsavedData.count} for date ${unsavedData.date}`);
            
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const allData: AllHitsData = stored ? JSON.parse(stored) : {};
            const previousDayData: DailyHits = allData[unsavedData.date] || { total: 0, hits: [] };
            
            previousDayData.total += unsavedData.count;
            previousDayData.hits.push({ timestamp: Date.now(), count: unsavedData.count });
            allData[unsavedData.date] = previousDayData;
  
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
            
            setCount(0);
            await AsyncStorage.removeItem(UNSAVED_COUNT_STORAGE_KEY);
          }
        } else {
          setCount(0);
        }
      };
  
      loadAndCheckUnsavedCount();
    }, [])
  );


  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('settingsChanged', (data) => {
      if (data?.bgColor) setBgColor(data.bgColor);
      if (typeof data?.soundEnabled === 'boolean') setSoundEnabled(data.soundEnabled);
      if (typeof data?.hapticsEnabled === 'boolean') setHapticsEnabled(data.hapticsEnabled);
      if (typeof data?.frequency === 'number') setFrequency(data.frequency);
      if (typeof data?.showCounter === 'boolean') setShowCounter(data.showCounter);
      if (typeof data?.disarrayEnabled === 'boolean') setDisarrayEnabled(data.disarrayEnabled);
      if (data?.selectedMusic) setSelectedMusic(data.selectedMusic); // ✅ NEW
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadSettings = async () => {
        const stored = await AsyncStorage.getItem('@user_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          setSoundEnabled(settings.soundEnabled ?? true);
          setHapticsEnabled(settings.hapticsEnabled ?? true);
          setShowCounter(settings.showCounter ?? true);
          if (typeof settings.disarrayEnabled === 'boolean') setDisarrayEnabled(settings.disarrayEnabled);
          if (settings.bgColor) { setBgColor(settings.bgColor); }
          if (typeof settings.frequency === 'number') { setFrequency(settings.frequency); }
          if (settings.selectedMusic) setSelectedMusic(settings.selectedMusic); // ✅ NEW
        }
      };
      loadSettings();
    }, [])
  );

  const persistUnsavedCount = async (newCount: number) => {
    const today = new Date().toISOString().split('T')[0];
    const data: UnsavedHitData = { count: newCount, date: today };
    try {
      await AsyncStorage.setItem(UNSAVED_COUNT_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to persist unsaved count', e);
    }
  };

  const handleHit = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();

    if (hapticsEnabled) {
      Haptics.selectionAsync();
    }

    playSound();

    setCount(prev => {
      const newCount = prev + 1;
      persistUnsavedCount(newCount);
      return newCount;
    });
  }, [hapticsEnabled, soundEnabled, scaleAnim]);


  const triggerSuccessAnimation = (savedValue: number) => {
    setSavedCount(savedValue);
    setShowSuccessModal(true);
    fadeAnim.setValue(0);
    modalScaleAnim.setValue(0.5);

    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalScaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowSuccessModal(false);
    });
  };

  const handleSave = async () => {
    if (count === 0) {
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const allData: AllHitsData = stored ? JSON.parse(stored) : {};

      const todayData: DailyHits = allData[today] || { total: 0, hits: [] };

      todayData.total += count;
      todayData.hits.push({ timestamp: Date.now(), count: count });

      allData[today] = todayData;

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
      
      triggerSuccessAnimation(count);

      setCount(0);
      await AsyncStorage.removeItem(UNSAVED_COUNT_STORAGE_KEY);


    } catch (e) {
      console.error('Failed to save hit count:', e);
      Alert.alert('Error', 'Failed to save data.');
    }
  };


  useEffect(() => {
    if (!autoHitEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      Animated.timing(slideAnim, {
        toValue: 150,
        duration: 300,
        useNativeDriver: true,
      }).start();
      return;
    }

    const startTimer = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(handleHit, frequency * 1000);
      console.log('Auto-hit timer started.');
    };

    startTimer();

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          console.log('App backgrounded: Auto-hit paused.');
        }
      } else if (nextAppState === 'active') {
        console.log('App foregrounded: Auto-hit resuming.');
        startTimer();
      }
    });

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [autoHitEnabled, frequency, handleHit]);

  const playSound = async () => {
    if (!soundEnabled) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/muyu.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.warn('Failed to play sound:', e);
    }
  };

  const handlePressIn = () => {
    handleHit();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  };

  const toggleMusic = async () => {
    const musicAsset = musicMap[selectedMusic as keyof typeof musicMap];
    if (!musicAsset) {
      console.warn('Selected music not found in map:', selectedMusic);
      return;
    }

    try {
      if (isMusicPlaying) {
        await musicRef.current?.pauseAsync();
        setIsMusicPlaying(false);
      } else {
        if (musicRef.current) {
          await musicRef.current.playAsync();
        } else {
          const { sound } = await Audio.Sound.createAsync(
            musicAsset,
            { isLooping: true }
          );
          musicRef.current = sound;
          await sound.playAsync();
        }
        setIsMusicPlaying(true);
      }
    } catch (e) {
      console.warn('Failed to toggle music:', e);
    }
  };

  useEffect(() => {
    // When music selection changes, stop and unload the current sound.
    if (musicRef.current) {
      musicRef.current.stopAsync();
      musicRef.current.unloadAsync();
      musicRef.current = null;
    }
    setIsMusicPlaying(false);

    // This is the component unmount cleanup function
    return () => {
      if (musicRef.current) {
        musicRef.current.unloadAsync();
      }
    };
  }, [selectedMusic]);

  return (
    <>
      <TouchableWithoutFeedback
        onPress={() => {
          if (!isMusicPlaying) {
            setShowMusicButton(true);
            setTimeout(() => setShowMusicButton(false), 3000);
          }
        }}
      >
        <View style={[styles.container, { backgroundColor: bgColor }]}>
          <View style={styles.topRightContainer}>
            <View style={[styles.switchContainer, { backgroundColor: bgColor }]}>
              <Text style={styles.switchLabel}>{t('index.autoHitToggle')}</Text>
              <Switch
                value={autoHitEnabled}
                onValueChange={setAutoHitEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={autoHitEnabled ? '#4CAF50' : '#f4f3f4'}
                style={styles.switchStyle}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: bgColor }]}
              onPress={handleSave}
            >
              <Text style={styles.switchLabel}>{t('index.saveButton')}</Text>
              <Feather name="pocket" size={18} color="#767577" />
            </TouchableOpacity>
          </View>


          {showCounter && <Text style={[
              styles.counterText, disarrayEnabled && {
                transform: [
                  { rotate: `${Math.random() * 10 - 5}deg` },
                  { translateX: Math.random() * 10 - 5 },
                  { translateY: Math.random() * 10 - 5 },
                ],
              },
            ]}
            >
              {count}
            </Text>}

          <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.Image
              source={require('../../assets/images/woodfish/muyu-white.png')}
              style={[styles.woodfishImage, { transform: [{ scale: scaleAnim }] }]}
              resizeMode="contain"
            />
          </TouchableWithoutFeedback>

          {(isMusicPlaying || showMusicButton) && (
            <TouchableOpacity
              style={[
                styles.musicButton,
                {
                  backgroundColor: `${bgColor}CC`,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.1)',
                },
              ]}
              onPress={toggleMusic}
            >
              <Feather
                style={styles.musicIcon}
                name={isMusicPlaying ? 'pause-circle' : 'play-circle'}
                size={24}
                color={isMusicPlaying ? '#4CAF50' : '#8B4513'}
              />
            </TouchableOpacity>
          )}
        </View>
      </TouchableWithoutFeedback>

      <Modal
        transparent
        visible={showSuccessModal}
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalContainer}>
          <Animated.View style={[
              styles.modalContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: modalScaleAnim }],
              }
            ]}>
            <Feather name="check-circle" size={48} color="white" />
            <Text style={styles.modalText}>{t('index.saveSuccessTitle')}</Text>
            <Text style={styles.modalCountText}>{savedCount}</Text>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topRightContainer: {
    position: 'absolute',
    top: 50,
    right: 5,
    alignItems: 'flex-end',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 10,
    color: '#8B4513',
    marginRight: 4,
    fontWeight: '600',
  },
  switchStyle: {
    transform: [{ scale: 0.6 }],
  },
  woodfishImage: {
    width: width * 0.7,
    height: width * 0.7,
    marginTop: 20,
  },
  counterText: {
    fontSize: width * 0.15,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  musicButton: {
    position: 'absolute',
    bottom: 30,
    right: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 1, height: 3 },
  },
  musicIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalContent: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: 'rgba(0, 100, 0, 0.8)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  modalCountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
});