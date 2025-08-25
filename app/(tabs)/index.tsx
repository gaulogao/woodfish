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
    Easing,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useLocalization } from '../useLocalization';

const { width } = Dimensions.get('window');
const STORAGE_KEY = 'daily_hits';
const UNSAVED_COUNT_STORAGE_KEY = 'unsaved_hit_data';
const imageSource =
    Platform.OS === 'web'
        ? { uri: '/images/woodfish/muyu.png' }
        : require('../../assets/images/woodfish/muyu-white.png');
const musicMap = {
    'dabeizhou.mp3': 'https://lnlsolutions.s3.ap-southeast-1.amazonaws.com/woodfish/dabeizhou.mp3',
    'guanshiyin.mp3': 'https://lnlsolutions.s3.ap-southeast-1.amazonaws.com/woodfish/guanshiyin.mp3',
};

interface HitRecord {
    timestamp: number;
    count: number;
    prayWords?: string;
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
    const [selectedMusic, setSelectedMusic] = useState('dabeizhou.mp3');
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const slideAnim = useRef(new Animated.Value(150)).current;
    const musicRef = useRef<Audio.Sound | null>(null);
    const [neverStopEnabled, setNeverStopEnabled] = useState(true);
    const [stopDuration, setStopDuration] = useState(0);
    const [stopTimestamp, setStopTimestamp] = useState<number | null>(null);
    const [countdownText, setCountdownText] = useState<string | null>(null);
    const [prayWords, setPrayWords] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedCount, setSavedCount] = useState(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const modalScaleAnim = useRef(new Animated.Value(0.5)).current;
    const NUM_BARS = 12;
    const waveBars = Array.from({ length: NUM_BARS }, () => useRef(new Animated.Value(0)).current);
    const prayWordsAnim = useRef(new Animated.Value(0)).current;
    const [soundVolume, setSoundVolume] = useState(1);
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    const rotateAnim = useRef(new Animated.Value(0)).current;

    // --- Hydration fix for web image ---
    const [mounted, setMounted] = useState(Platform.OS !== 'web');
    useEffect(() => {
        if (Platform.OS === 'web') setMounted(true);
    }, []);
    // -----------------------------------

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
            if (data?.selectedMusic) setSelectedMusic(data.selectedMusic);
            if (typeof data?.prayWords === 'string') setPrayWords(data.prayWords);
            if (data.soundVolume !== undefined) {
                setSoundVolume(data.soundVolume);
            }
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
                    if (settings.selectedMusic) setSelectedMusic(settings.selectedMusic);
                    if (settings.prayWords) setPrayWords(settings.prayWords);
                    if (typeof settings.soundVolume === 'number') setSoundVolume(settings.soundVolume);
                }
            };
            loadSettings();
        }, [])
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('autohitSettingsChanged', (data) => {
            setNeverStopEnabled(data.neverStopEnabled);
            setStopDuration(data.stopDuration);
            setStopTimestamp(data.stopTimestamp);
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!autoHitEnabled) return;
        if (neverStopEnabled) return;

        if (!neverStopEnabled && stopDuration > 0 && stopTimestamp === null) {
            const timeout = setTimeout(() => {
                setAutoHitEnabled(false);
                setStopDuration(0);
                setStopTimestamp(null);
                if (isMusicPlaying) {
                    toggleMusic();
                }
            }, stopDuration * 60 * 1000);

            return () => clearTimeout(timeout);
        }

        if (!neverStopEnabled && stopDuration === 0 && stopTimestamp !== null) {
            const now = Date.now();
            const delay = stopTimestamp - now;

            if (delay > 0) {
                const timeout = setTimeout(() => {
                    setAutoHitEnabled(false);
                    setStopDuration(0);
                    setStopTimestamp(null);
                    if (isMusicPlaying) {
                        toggleMusic();
                    }
                }, delay);

                return () => clearTimeout(timeout);
            } else {
                setAutoHitEnabled(false);
                setStopDuration(0);
                setStopTimestamp(null);
                if (isMusicPlaying) {
                    toggleMusic();
                }
            }
        }
    }, [autoHitEnabled, neverStopEnabled, stopDuration, stopTimestamp, isMusicPlaying]);

    useEffect(() => {
        if (!autoHitEnabled || neverStopEnabled) {
            setCountdownText(null);
            return;
        }

        let targetTime: number | null = null;

        if (stopDuration > 0 && stopTimestamp === null) {
            targetTime = Date.now() + stopDuration * 60 * 1000;
        } else if (stopDuration === 0 && stopTimestamp !== null) {
            targetTime = stopTimestamp;
        }

        if (!targetTime) {
            setCountdownText(null);
            return;
        }

        const updateCountdown = () => {
            const now = Date.now();
            const diff = targetTime! - now;

            if (diff <= 0) {
                setCountdownText(null);
                return;
            }

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setCountdownText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [autoHitEnabled, neverStopEnabled, stopDuration, stopTimestamp]);

    const persistUnsavedCount = async (newCount: number) => {
        const today = new Date().toISOString().split('T')[0];
        const data: UnsavedHitData = { count: newCount, date: today };
        try {
            await AsyncStorage.setItem(UNSAVED_COUNT_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to persist unsaved count', e);
        }
    };

    const playSound = useCallback(async () => {
        if (!soundEnabled) return;
        try {
            const { sound } = await Audio.Sound.createAsync(
                require('../../assets/sound/muyu.mp3'),
                { volume: soundVolume }
            );
            await sound.setVolumeAsync(soundVolume);
            await sound.playAsync();

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync();
                }
            });
        } catch (e) {
            console.warn('Failed to play sound:', e);
        }
    }, [soundEnabled, soundVolume]);

    const handleHit = useCallback(() => {
        Animated.sequence([
            Animated.spring(scaleAnim, {
                toValue: 0.85,
                useNativeDriver: Platform.OS !== 'web',
                speed: 20,
                bounciness: 10,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: Platform.OS !== 'web',
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
        if (prayWords) triggerPrayWordsAnimation();

    }, [hapticsEnabled, soundEnabled, scaleAnim, playSound, prayWords]);

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
                    useNativeDriver: Platform.OS !== 'web',
                }),
                Animated.spring(modalScaleAnim, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: Platform.OS !== 'web',
                }),
            ]),
            Animated.delay(200),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: Platform.OS !== 'web',
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
            todayData.hits.push({
                timestamp: Date.now(),
                count: count,
                prayWords: prayWords !== '' ? prayWords : undefined,
            });

            allData[today] = todayData;

            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

            triggerSuccessAnimation(count);

            setCount(0);
            await AsyncStorage.removeItem(UNSAVED_COUNT_STORAGE_KEY);

        } catch (e) {
            console.error('Failed to save hit count:', e);
            Alert.alert(
                t('alert.saveErrorTitle'),
                t('alert.saveErrorMessage'),
                [{ text: t('common.ok'), onPress: () => { } }]
            );
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
                useNativeDriver: Platform.OS !== 'web',
            }).start();
            return;
        }

        const startTimer = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(handleHit, frequency * 1000);
        };

        startTimer();

        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
        }).start();

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState.match(/inactive|background/)) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            } else if (nextAppState === 'active') {
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

    const handlePressIn = () => {
        handleHit();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
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
                setIsMusicLoading(true);
                Animated.loop(
                    Animated.timing(rotateAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: Platform.OS !== 'web',
                        easing: Easing.linear,
                    })
                ).start();

                if (musicRef.current) {
                    await musicRef.current.playAsync();
                } else {
                    const { sound } = await Audio.Sound.createAsync(
                        { uri: musicAsset },
                        { isLooping: true }
                    );
                    musicRef.current = sound;
                    await sound.playAsync();
                }

                setIsMusicPlaying(true);
            }
        } catch (e) {
            console.warn('Failed to toggle music:', e);
            Alert.alert(
                t('alert.playbackErrorTitle'),
                t('alert.playbackErrorMessage'),
                [{ text: t('common.ok'), onPress: () => { } }]
            );
        } finally {
            setIsMusicLoading(false);
            rotateAnim.setValue(0);
        }
    };

    useEffect(() => {
        if (musicRef.current) {
            musicRef.current.stopAsync();
            musicRef.current.unloadAsync();
            musicRef.current = null;
        }
        setIsMusicPlaying(false);

        return () => {
            if (musicRef.current) {
                musicRef.current.unloadAsync();
            }
        };
    }, [selectedMusic]);

    useEffect(() => {
        const animations = waveBars.map((bar, i) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bar, {
                        toValue: 1,
                        duration: 300 + i * 100,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                    Animated.timing(bar, {
                        toValue: 0,
                        duration: 300 + i * 100,
                        useNativeDriver: Platform.OS !== 'web',
                    }),
                ])
            )
        );

        if (isMusicPlaying) {
            animations.forEach(anim => anim.start());
        } else {
            waveBars.forEach(bar => bar.stopAnimation());
        }

        return () => {
            waveBars.forEach(bar => bar.stopAnimation());
        };
    }, [isMusicPlaying]);

    useEffect(() => {
        const preloadMusic = async () => {
            const musicAsset = musicMap[selectedMusic as keyof typeof musicMap];
            if (!musicAsset) return;

            try {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: musicAsset },
                    { shouldPlay: false, isLooping: true }
                );
                musicRef.current = sound;
            } catch (e) {
                console.warn('Failed to preload music:', e);
            }
        };

        preloadMusic();

        return () => {
            musicRef.current?.unloadAsync();
            musicRef.current = null;
        };
    }, [selectedMusic]);

    const triggerPrayWordsAnimation = () => {
        prayWordsAnim.setValue(0);
        Animated.sequence([
            Animated.timing(prayWordsAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: Platform.OS !== 'web',
            }),
            Animated.delay(200),
            Animated.timing(prayWordsAnim, {
                toValue: 2,
                duration: 100,
                useNativeDriver: Platform.OS !== 'web',
            }),
        ]).start(() => {
            prayWordsAnim.setValue(0);
        });
    };

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
                        {countdownText && (
                            <View style={{ marginBottom: 6 }}>
                                <Text style={{ fontSize: 10, fontWeight: '600', color: '#8B4513' }}>
                                    ⌛ {countdownText}
                                </Text>
                            </View>
                        )}

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
                    {prayWords !== '' && (
                        <Animated.Text
                            style={[
                                styles.prayWordsText,
                                {
                                    opacity: prayWordsAnim.interpolate({
                                        inputRange: [0, 1, 2],
                                        outputRange: [0, 1, 0],
                                    }),
                                    transform: [
                                        {
                                            scale: prayWordsAnim.interpolate({
                                                inputRange: [0, 1, 2],
                                                outputRange: [0.8, 1.2, 1.2],
                                            }),
                                        },
                                        {
                                            translateY: prayWordsAnim.interpolate({
                                                inputRange: [0, 1, 2],
                                                outputRange: [0, 0, -40],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            {prayWords}
                        </Animated.Text>
                    )}
                    {Platform.OS === 'web' ? (
                        mounted && (
                            <div
                                style={{
                                    display: 'inline-block',
                                    cursor: 'pointer',
                                    marginTop: 20,
                                }}
                                onClick={handleHit}
                            >
                                <img
                                    src="/images/woodfish/muyu.png"
                                    style={{
                                        width: width * 0.2,
                                        height: width * 0.2,
                                        objectFit: 'contain',
                                        transform: `scale(${scaleAnim.__getValue?.() || 1})`,
                                        transition: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                    }}
                                    alt="muyu"
                                    draggable={false}
                                />
                            </div>
                        )
                    ) : (
                        <Animated.Image
                            source={require('../../assets/images/woodfish/muyu-white.png')}
                            style={[styles.woodfishImage, { transform: [{ scale: scaleAnim }] }]}
                            resizeMode="contain"
                        />
                    )}

                    {true && (
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
                                name={isMusicPlaying ? 'pause' : 'music'}
                                size={24}
                                color={isMusicPlaying ? '#4CAF50' : '#8B4513'}
                            />
                        </TouchableOpacity>
                    )}
                    {isMusicLoading && (
                        <Animated.View
                            style={{
                                position: 'absolute',
                                bottom: 90,
                                right: 20,
                                transform: [{
                                    rotate: rotateAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0deg', '360deg'],
                                    }),
                                }],
                            }}
                        >
                            <Feather name="loader" size={20} color="#8B4513" />
                        </Animated.View>
                    )}

                    {isMusicPlaying && (
                        <View style={styles.waveContainer}>
                            {waveBars.map((bar, index) => (
                                <Animated.View
                                    key={index}
                                    style={[
                                        styles.waveBar,
                                        {
                                            transform: [
                                                {
                                                    scaleY: bar.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.5, 1.5],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                />
                            ))}
                        </View>
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
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.07)',
    },
    switchLabel: {
        fontSize: 10,
        color: '#F5F5DC',
        marginRight: 4,
        fontWeight: '600',
    },
    counterText: {
        fontSize: width * 0.08,
        fontWeight: 'bold',
        color: '#F5F5DC',
    },
    switchStyle: {
        transform: [{ scale: 0.6 }],
    },
    woodfishImage: {
        width: width * 0.2,
        height: width * 0.2,
        marginTop: 20,
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
    waveContainer: {
        position: 'absolute',
        bottom: 90,
        right: 20,
        flexDirection: 'row',
        gap: 4,
    },
    waveBar: {
        width: 2,
        height: 20,
        borderRadius: 2,
        backgroundColor: '#4CAF50',
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
    prayWordsText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F5F5DC',
        marginTop: 10,
        textAlign: 'center',
    }
});