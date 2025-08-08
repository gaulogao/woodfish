import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
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
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  // Frequency state is no longer needed here
  const [disarrayEnabled, setDisarrayEnabled] = useState(false);
  const [showCounter, setshowCounter] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState('dabeizhou.mp3');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showMusicPicker, setShowMusicPicker] = useState(false);

  const bgColors = [
    { label: t('settings.colors.beige'), value: '#eab676' },
    { label: t('settings.colors.black'), value: '#000000' },
    { label: t('settings.colors.red'), value: '#640303ff' },
  ];

  const languages = [
    { label: t('settings.languages.en'), value: 'en' },
    { label: t('settings.languages.zhCN'), value: 'zh-CN' },
    { label: t('settings.languages.zhHK'), value: 'zh-HK' },
    { label: t('settings.languages.ms'), value: 'ms' },
  ];

  const musicOptions = [
    { label: t('settings.music.dabeizhou') || 'Da Bei Zhou', value: 'dabeizhou.mp3' },
    { label: t('settings.music.guanshiyin') || 'Guan Shi Yin', value: 'guanshiyin.mp3' },
  ];

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
        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    })();
  }, []);

  // This effect saves all settings managed by this screen
  useEffect(() => {
    const saveSettings = async () => {
      try {
        // Read existing settings to not overwrite frequency
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
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        DeviceEventEmitter.emit('settingsChanged', newSettings);
      } catch (e) {
        console.warn('Failed to save settings', e);
      }
    };
    saveSettings();
  }, [bgColor, language, soundEnabled, hapticsEnabled, disarrayEnabled, showCounter, selectedMusic]);

  const confirmReset = () => {
    Alert.alert(
      t('settings.resetConfirmationTitle'),
      t('settings.resetConfirmationMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              const defaultSettings = {
                bgColor: '#000000',
                language: 'en',
                soundEnabled: true,
                hapticsEnabled: true,
                frequency: 1, // Reset frequency to its default
                disarrayEnabled: false,
                showCounter: true,
                selectedMusic: 'dabeizhou.mp3',
              };
              await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));

              // Update local state to reflect the reset
              setBgColor(defaultSettings.bgColor);
              setLanguage(defaultSettings.language);
              setSoundEnabled(defaultSettings.soundEnabled);
              setHapticsEnabled(defaultSettings.hapticsEnabled);
              setDisarrayEnabled(defaultSettings.disarrayEnabled);
              setshowCounter(defaultSettings.showCounter);
              setSelectedMusic(defaultSettings.selectedMusic);

              // Globally emit all reset settings
              DeviceEventEmitter.emit('settingsChanged', defaultSettings);
              console.log('Data reset!');
            } catch (e) {
              console.warn('Failed to reset data', e);
            }
          },
        },
      ]
    );
  };

  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setter(prev => !prev);
  };

  const iconColor = "#4B3F38";
  const iconSize = width * 0.055;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Feather name="settings" size={width * 0.08} color={iconColor} />
            <Text style={styles.title}>{t('settings.title')}</Text>
          </View>

          {/* Background Color Picker */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(setShowColorPicker)}>
            <Feather name="droplet" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.bgColorLabel')}</Text>
          </TouchableOpacity>
          {showColorPicker && (
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={bgColor} onValueChange={setBgColor} mode="dropdown" style={styles.picker} dropdownIconColor="#4B3F38">
                {bgColors.map((item) => <Picker.Item key={item.value} label={item.label} value={item.value} color="#000" />)}
              </Picker>
            </View>
          )}

          {/* Language Picker */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(setShowLanguagePicker)}>
            <Feather name="globe" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.languageLabel')}</Text>
          </TouchableOpacity>
          {showLanguagePicker && (
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={language} onValueChange={setLanguage} mode="dropdown" style={styles.picker} dropdownIconColor="#4B3F38">
                {languages.map((item) => <Picker.Item key={item.value} label={item.label} value={item.value} color="#000" />)}
              </Picker>
            </View>
          )}

          {/* Music Picker */}
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(setShowMusicPicker)}>
            <Feather name="music" size={iconSize} color={iconColor} />
            <Text style={styles.label}>{t('settings.musicLabel') || 'Background Music'}</Text>
          </TouchableOpacity>
          {showMusicPicker && (
            <View style={styles.pickerWrapper}>
              <Picker selectedValue={selectedMusic} onValueChange={setSelectedMusic} mode="dropdown" style={styles.picker} dropdownIconColor="#4B3F38">
                {musicOptions.map((item) => <Picker.Item key={item.value} label={item.label} value={item.value} color="#000" />)}
              </Picker>
            </View>
          )}

          {/* Auto Hit Settings Link */}
          <TouchableOpacity style={styles.toggleRow} onPress={() => router.push('settings/autohit-settings')}>
            <View style={styles.labelContainer}>
              <Feather name="fast-forward" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.autohit')}</Text>
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

          {/* Haptics Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.labelContainer}>
              <Feather name="activity" size={iconSize} color={iconColor} />
              <Text style={styles.label}>{t('settings.hapticsLabel')}</Text>
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
            <Text style={styles.resetButtonText}>{t('settings.resetButton')}</Text>
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
    color: '#4B3F38',
    textDecorationLine: 'underline',
    marginLeft: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginTop: 20,
    marginBottom: 8,
  },
  label: {
    fontSize: width * 0.048,
    fontWeight: '600',
    color: '#574c46ff',
    marginLeft: 12,
  },
  pickerWrapper: {
    width: '90%',
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
    borderColor: '#8B4513',
    borderWidth: 1,
    marginBottom: 10,
  },
  picker: {
    width: '100%',
    color: '#000',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '90%',
    marginTop: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 63, 56, 0.1)',
    paddingBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
