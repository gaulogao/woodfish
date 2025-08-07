import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    DeviceEventEmitter,
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useLocalization } from '../useLocalization';

const { width } = Dimensions.get('window');
const STORAGE_KEY = '@user_settings';

/**
 * This screen provides a dedicated space for auto-hit settings.
 * It is presented as a modal.
 */
export default function AutoHitSettingsScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  const [frequency, setFrequency] = useState(1);
  const [bgColor, setBgColor] = useState('#F5F5DC');

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        if (typeof settings.frequency === 'number') {
          setFrequency(settings.frequency);
        }
        if (settings.bgColor) {
          setBgColor(settings.bgColor);
        }
      }
    };
    loadSettings();
  }, []);

  // Save frequency when the slider interaction is complete
  const handleFrequencyChange = async (newFrequency: number) => {
    setFrequency(newFrequency);
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const settings = stored ? JSON.parse(stored) : {};
      const updatedSettings = { ...settings, frequency: newFrequency };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
      // Notify other parts of the app about the change
      DeviceEventEmitter.emit('settingsChanged', { frequency: newFrequency });
    } catch (e) {
      console.warn('Failed to save frequency setting', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.autohit')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Feather name="x" size={28} color="#4B3F38" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View style={styles.frequencySection}>
          <View style={styles.labelContainer}>
            <Feather name="clock" size={width * 0.055} color="#4B3F38" />
            <Text style={styles.label}>
              {t('settings.frequencyLabel')} ({frequency} {t('settings.seconds')})
            </Text>
          </View>
          <Slider
            style={styles.frequencySlider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={frequency}
            onValueChange={setFrequency} // Update UI instantly
            onSlidingComplete={handleFrequencyChange} // Save only when user releases slider
            minimumTrackTintColor="#8B4513"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#4B3F38"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(75, 63, 56, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4B3F38',
  },
  closeButton: {
    position: 'absolute',
    right: 15,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 30,
    paddingHorizontal: 20,
  },
  frequencySection: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 15,
    padding: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: width * 0.048,
    fontWeight: '600',
    color: '#4B3F38',
    marginLeft: 12,
  },
  frequencySlider: {
    width: '100%',
    height: 40,
    marginTop: 10,
  },
});
