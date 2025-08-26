import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  DeviceEventEmitter,
  Dimensions,
  LayoutAnimation,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { Slider } from '@react-native-assets/slider';
import RNPickerSelect from 'react-native-picker-select';
import { useLocalization } from '../../useLocalization';


const { width } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = '@user_settings';

export default function SettingsScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const [bgColor, setBgColor] = useState('#000000');
  const [language, setLanguage] = useState('en');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticsEnabled, setHapticsEnabled] = useState(false);
  {/*// Frequency state is no longer needed here*/}
  const [disarrayEnabled, setDisarrayEnabled] = useState(false);
  const [showCounter, setshowCounter] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState('dabeizhou.mp3');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [prayWords, setprayWords] = useState('');
  const [soundVolume, setSoundVolume] = useState(1); // default full volume
  const [showAdModal, setShowAdModal] = useState(true);
  const bgColors = [
    { label: t('settings.colors.beige') || 'Beige', value: '#eab676' },
    { label: t('settings.colors.black') || 'Black', value: '#000000' },
    { label: t('settings.colors.red') || 'Red', value: '#640303ff' },
  ];

  const languages = [
    { label: t('settings.languages.en') || 'English', value: 'en' },
    { label: t('settings.languages.zhCN') || '简体中文', value: 'zh-CN' },
    { label: t('settings.languages.zhHK') || '繁體中文', value: 'zh-HK' },
    { label: t('settings.languages.ms') || 'Malay', value: 'ms' },
  ];

  const musicOptions = [
    { label: t('settings.music.dabeizhou') || 'Da Bei Zhou', value: 'dabeizhou.mp3' },
    { label: t('settings.music.guanshiyin') || 'Guan Shi Yin', value: 'guanshiyin.mp3' },
  ];

  useEffect(() => {
    {/*// Load AdSense script when modal is shown*/}
    if (Platform.OS === 'web' && showAdModal && typeof window !== 'undefined') {
      if (!document.getElementById('adsbygoogle-js')) {
        const script = document.createElement('script');
        script.id = 'adsbygoogle-js';
        script.async = true;
        script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
        document.body.appendChild(script);
      }
      {/*// (Re)initialize ads*/}
      setTimeout(() => {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }, 500);
    }
  }, [showAdModal]);
  // This effect loads all settings except frequency
  useEffect(() => {
    (async () => {
      try {
        const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.bgColor) setBgColor(settings.bgColor);
          if (settings.language) setLanguage(settings.language);
          if (typeof settings.soundEnabled === 'boolean') setSoundEnabled(settings.soundEnabled);
          if (typeof settings.hapticsEnabled === 'boolean') setHapticsEnabled(settings.hapticsEnabled);
          if (typeof settings.disarrayEnabled === 'boolean') setDisarrayEnabled(settings.disarrayEnabled);
          if (typeof settings.showCounter === 'boolean') setshowCounter(settings.showCounter);
          if (settings.selectedMusic) setSelectedMusic(settings.selectedMusic);
          if (settings.prayWords) setprayWords(settings.prayWords);
          if (typeof settings.soundVolume === 'number') setSoundVolume(settings.soundVolume);

        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    })();
  }, []);

  {/*// This effect saves all settings managed by this screen*/}
  useEffect(() => {
    const saveSettings = async () => {
      try {
        {/*// Read existing settings to not overwrite frequency*/}
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        const existingSettings = existing ? JSON.parse(existing) : {};

        const newSettings = {
          ...existingSettings,
          bgColor,
          language,
          soundEnabled,
          hapticsEnabled,
          disarrayEnabled,
          showCounter,
          selectedMusic,
          prayWords,
          soundVolume,

        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        DeviceEventEmitter.emit('settingsChanged', newSettings);
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
    };
    saveSettings();
  }, [bgColor, language, soundEnabled, hapticsEnabled, disarrayEnabled, showCounter, selectedMusic, prayWords, soundVolume]);

  const confirmReset = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        t('settings.resetConfirmationMessage') || 'Are you sure you want to reset all settings?'
      );
      if (confirmed) {
        handleReset();
      }
    } else {
      Alert.alert(
        t('settings.resetConfirmationTitle'),
        t('settings.resetConfirmationMessage'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.confirm'),
            style: 'destructive',
            onPress: handleReset,
          },
        ]
      );
    }
  };

  const handleReset = async () => {
    try {
      const defaultSettings = {
        bgColor: '#000000',
        language: 'en',
        soundEnabled: true,
        hapticsEnabled: false,
        frequency: 1,
        disarrayEnabled: false,
        showCounter: false,
        selectedMusic: 'dabeizhou.mp3',
        prayWords: '',
        soundVolume: 1,
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
      setBgColor(defaultSettings.bgColor);
      setLanguage(defaultSettings.language);
      setSoundEnabled(defaultSettings.soundEnabled);
      setHapticsEnabled(defaultSettings.hapticsEnabled);
      setDisarrayEnabled(defaultSettings.disarrayEnabled);
      setshowCounter(defaultSettings.showCounter);
      setSelectedMusic(defaultSettings.selectedMusic);
      setprayWords('');
      setSoundVolume(defaultSettings.soundVolume);

      if (Platform.OS === 'web') {
        window.dispatchEvent(new CustomEvent('settingsChanged', { detail: defaultSettings }));
      } else {
        DeviceEventEmitter.emit('settingsChanged', defaultSettings);
      }
      console.log('Data reset!');
    } catch (e) {
      console.warn('Failed to reset data', e);
    }
  };

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTimeout(() => setter(prev => !prev), 100); // 👈 small delay helps on iOS
  };


  const iconColor = "#4B3F38";
  const iconSize = width * 0.055;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
     {/*// In your return JSX, add this at the top:*/}
      {Platform.OS === 'web' && showAdModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 20,
            maxWidth: 350,
            width: '90%',
            boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
            textAlign: 'center',
            position: 'relative'
          }}>
            <button
              onClick={() => setShowAdModal(false)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'transparent',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer'
              }}
              aria-label="Close"
            >×</button>
            {/* Replace the data-ad-slot with your AdSense slot ID */}
            <ins className="adsbygoogle"
              style={{ display: 'block', width: '100%', height: 250 }}
              data-ad-client="ca-pub-3940256099942544"
              data-ad-slot="1234567890"
              data-ad-format="auto"
              data-full-width-responsive="true"></ins>
          </div>
        </div>
      )}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Feather name="settings" size={width * 0.08} color={iconColor} />
            <Text style={styles.title}>{t('settings.title') || 'Settings'}</Text>
          </View>

          {/* Background Color Picker */}
          <Pressable style={styles.sectionHeader} onPress={() => toggleSection(setShowColorPicker)}>
            <Feather name="droplet" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.bgColorLabel') || 'Background Color'}</Text>
          </Pressable>
          {showColorPicker && (
            <View style={styles.pickerWrapper} pointerEvents="box-none">
              <RNPickerSelect
                value={bgColor}
                onValueChange={setBgColor}
                items={bgColors}
                mode="modal"
                useNativeAndroidPickerStyle={false}
                placeholder={{}} // 👈 disables the default "Select an item..."
                style={{
                  inputIOS: styles.pickerText,
                  inputAndroid: styles.pickerText,
                  iconContainer: {
                    top: 12,
                    right: 12,
                    padding: 10, // 👈 increases touchable area
                  },
                }}
                Icon={() => <Feather name="chevron-down" size={iconSize * 1.2} color="#F5F5DC" />}

              />
            </View>
          )}

          {/* Language Picker */}
          <Pressable style={styles.sectionHeader} onPress={() => toggleSection(setShowLanguagePicker)}>
            <Feather name="globe" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.languageLabel') || 'Language'}</Text>
          </Pressable>
          {showLanguagePicker && (
            <View style={styles.pickerWrapper} pointerEvents="box-none">
              <RNPickerSelect
                value={language}
                onValueChange={setLanguage}
                items={languages}
                mode="modal"
                useNativeAndroidPickerStyle={false}
                placeholder={{}} // 👈 disables default "Select an item..."
                style={{
                  inputIOS: styles.pickerText,
                  inputAndroid: styles.pickerText,
                  iconContainer: {
                    top: 12,
                    right: 12,
                    padding: 10, // 👈 increases touchable area
                  },
                }}
                Icon={() => <Feather name="chevron-down" size={iconSize * 1.2} color="#F5F5DC" />}
              />
            </View>
          )}


          {/* Music Picker */}
          <Pressable style={styles.sectionHeader} onPress={() => toggleSection(setShowMusicPicker)}>
            <Feather name="music" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.musicLabel') || 'Background Music'}</Text>
          </Pressable>
          {showMusicPicker && (
            <View style={styles.pickerWrapper} pointerEvents="box-none">
              <RNPickerSelect
                value={selectedMusic}
                onValueChange={setSelectedMusic}
                items={musicOptions}
                mode="modal"
                useNativeAndroidPickerStyle={false}
                placeholder={{}} // 👈 removes default "Select an item..."
                style={{
                  inputIOS: styles.pickerText,
                  inputAndroid: styles.pickerText,
                  iconContainer: {
                    top: 12,
                    right: 12,
                    padding: 10, // 👈 increases touchable area
                  },
                }}
                Icon={() => <Feather name="chevron-down" size={iconSize * 1.2} color="#F5F5DC" />}
              />
            </View>
          )}

          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="edit-3" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.prayWords') || 'Pray Words'}</Text>
            </View>
          </View>
          <View style={styles.pickerWrapper}>
            <TextInput
              style={[styles.picker, { padding: 10 }]}
              placeholder={t('settings.prayWords')}
              placeholderTextColor="#fff"
              value={prayWords}
              onChangeText={setprayWords}
            />
          </View>


          {/* Auto Hit Settings Link */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => router.push('settings/autohit-settings')}>
            <View style={styles.labelContainer}>
              <Feather name="fast-forward" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.autohit') || 'Auto Hit'}</Text>
            </View>
            <Feather name="chevron-right" size={iconSize} color={iconColor} />
          </TouchableOpacity>

          {/* Sound Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="volume-2" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.soundLabel')}</Text>
            </View>
            <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ false: '#ccc', true: '#8B4513' }} thumbColor={soundEnabled ? '#fff' : '#888'} />
          </View>

          {/* Sound Volume Slider */}
          {soundEnabled && (
            <View style={[styles.toggleRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
              <View style={styles.labelContainer}>
                <Feather name="sliders" size={iconSize} color={iconColor} />
                <Text style={styles.label}>{t('settings.soundVolumeLabel') || 'Sound Volume'}</Text>
              </View>
              <View style={{ width: '100%', paddingHorizontal: 20 }}>
                <Slider
                  value={soundVolume}
                  onValueChange={(value) => {
                    setSoundVolume(value);
                    DeviceEventEmitter.emit('settingsChanged', { soundVolume: value });
                  }}
                  minimumValue={0}
                  maximumValue={1}
                  step={0.05}
                  trackHeight={12}
                  trackStyle={{
                    backgroundColor: 'transparent',
                    borderRadius: 0,
                    flexDirection: 'row',
                  }}
                  minTrackStyle={{
                    backgroundColor: '#8B4513',
                    borderRadius: 0,
                  }}
                  thumbTintColor="#4B3F38"
                  thumbSize={20}
                  slideOnTap={true}
                  CustomThumb={({ value }) => (
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        backgroundColor: '#4B3F38',
                        borderRadius: 2,
                      }}
                    />
                  )}
                  StepMarker={({ index }) => (
                    <View
                      style={{
                        width: 4,
                        height: 12,
                        backgroundColor: '#fff',
                        marginHorizontal: 4,
                      }}
                    />
                  )}
                />
              </View>
            </View>
          )}

          {/* Haptics Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="activity" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.hapticsLabel') || 'Haptics Feedback'}</Text>
            </View>
            <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} trackColor={{ false: '#ccc', true: '#8B4513' }} thumbColor={hapticsEnabled ? '#fff' : '#888'} />
          </View>

          {/* Disarray Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="shuffle" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.disarrayLabel') || 'Disarray Counter'}</Text>
            </View>
            <Switch value={disarrayEnabled} onValueChange={setDisarrayEnabled} trackColor={{ false: '#ccc', true: '#8B4513' }} thumbColor={disarrayEnabled ? '#fff' : '#888'} />
          </View>

          {/* Show Counter Text Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="hash" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.showCounterLabel') || 'Show Counter'}</Text>
            </View>
            <Switch value={showCounter} onValueChange={setshowCounter} trackColor={{ false: '#ccc', true: '#8B4513' }} thumbColor={showCounter ? '#fff' : '#888'} />
          </View>

          {/* Reset Button */}
          <Pressable style={styles.resetButton} onPress={confirmReset}>
            <Feather name="trash-2" size={width * 0.045} color="#fff" />
            <Text style={styles.resetButtonText}>{t('settings.resetButton') || 'Reset Settings'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  content: {
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#fff',
    textDecorationLine: 'underline',
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.07)', // ✅ Dimmed background
    padding: 10,
    borderRadius: 12,
  },
  label: {
    fontSize: width * 0.048,
    fontWeight: '600',
    color: '#F5F5DC', // ✅ Warm beige text
    marginLeft: 12,
  },
  pickerWrapper: {
    width: '90%',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.07)', // ✅ Dimmed background
    overflow: 'hidden',
    borderColor: '#8B4513',
    borderWidth: 1,
    marginBottom: 10,
  },
  picker: {
    width: '100%',
    color: '#F5F5DC', // ✅ Matches label
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)', // ✅ Dimmed background
    borderRadius: 12,
    padding: 12,
  },
  resetButton: {
    marginTop: 40,
    backgroundColor: '#8B0000',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: '600',
    marginLeft: 8,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: width * 0.045,
    paddingVertical: 12,
    paddingHorizontal: 10,
    color: '#F5F5DC', // Warm beige text
    backgroundColor: 'rgba(255,255,255,0.07)', // Dimmed background
    borderRadius: 10,
  },

});

