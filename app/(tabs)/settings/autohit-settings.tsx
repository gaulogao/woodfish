import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    DeviceEventEmitter,
    Dimensions,
    LayoutAnimation,
    Modal,
    Platform,
    SafeAreaView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    UIManager,
    View,
} from 'react-native';

import { useLocalization } from '../../useLocalization';

const { width } = Dimensions.get('window');
const STORAGE_KEY = '@user_settings';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function AutoHitSettingsScreen() {
  const { t } = useLocalization();
  const router = useRouter();
  // NeverStop is enabled by default, not persisted
  const [neverStopEnabled, setNeverStopEnabled] = useState<boolean>(true);
  const [stopDuration, setStopDuration] = useState<number>(0); // Default to 0 minutes
  const [stopTimestamp, setStopTimestamp] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<number>(1);
  const [bgColor, setBgColor] = useState<string>('#F5F5DC');
  const [showDateTimePickerModal, setShowDateTimePickerModal] = useState<boolean>(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Function to save a specific setting (neverStopEnabled is NOT persisted)
  const saveSetting = async (key: string, value: any) => {
    if (key === 'neverStopEnabled') return;
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const existingSettings = existing ? JSON.parse(existing) : {};
      const newSettings = { ...existingSettings, [key]: value };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      DeviceEventEmitter.emit('settingsChanged', newSettings);
    } catch (e) {
      console.warn('Failed to save settings', e);
    }
  };

  // Load initial settings (neverStopEnabled is NOT loaded)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const settings = JSON.parse(stored);
          if (typeof settings.stopDuration === 'number') {
            setStopDuration(settings.stopDuration);
          }
          if (typeof settings.stopTimestamp === 'number') {
            setStopTimestamp(settings.stopTimestamp);
          }
          if (typeof settings.frequency === 'number') {
            setFrequency(settings.frequency);
          }
          if (settings.bgColor) {
            setBgColor(settings.bgColor);
          }
        }
      } catch (e) {
        console.warn('Failed to load settings', e);
      }
    };
    loadSettings();
  }, []);

  // Create an event listener for autohit settings changes
  useEffect(() => {
    DeviceEventEmitter.emit('autohitSettingsChanged', {
        neverStopEnabled,
        stopDuration,
        stopTimestamp,
    });
  }, [neverStopEnabled, stopDuration, stopTimestamp]);

  const handleNeverStopChange = (value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNeverStopEnabled(value);
    if (value) {
      setStopDuration(0);
      setStopTimestamp(null);
    }
  };

  const handleStopDurationChange = (value: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStopDuration(value);
    setNeverStopEnabled(false);
    setStopTimestamp(null);
    saveSetting('stopDuration', value);
    saveSetting('stopTimestamp', null);
  };

  // Improved date change handlers to avoid mutating Date objects
  const changeTempDate = (type: 'year' | 'month' | 'day' | 'hour' | 'minute', delta: number) => {
    setTempDate(prev => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      const d = prev.getDate();
      const h = prev.getHours();
      const min = prev.getMinutes();
      let newDate;
      switch (type) {
        case 'year':
          newDate = new Date(y + delta, m, d, h, min);
          break;
        case 'month': {
          let newMonth = m + delta;
          let newYear = y;
          if (newMonth > 11) { newMonth = 0; newYear += 1; }
          if (newMonth < 0) { newMonth = 11; newYear -= 1; }
          const days = getDaysInMonth(newYear, newMonth);
          newDate = new Date(newYear, newMonth, Math.min(d, days), h, min);
          break;
        }
        case 'day': {
          const days = getDaysInMonth(y, m);
          let newDay = d + delta;
          if (newDay > days) newDay = 1;
          if (newDay < 1) newDay = days;
          newDate = new Date(y, m, newDay, h, min);
          break;
        }
        case 'hour': {
          let newHour = h + delta;
          if (newHour > 23) newHour = 0;
          if (newHour < 0) newHour = 23;
          newDate = new Date(y, m, d, newHour, min);
          break;
        }
        case 'minute': {
          let newMinute = min + delta;
          if (newMinute > 59) newMinute = 0;
          if (newMinute < 0) newMinute = 59;
          newDate = new Date(y, m, d, h, newMinute);
          break;
        }
        default:
          newDate = prev;
      }
      return newDate;
    });
  };

  const handleStopDateChange = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newTimestamp = tempDate.getTime();
    setStopTimestamp(newTimestamp);
    setNeverStopEnabled(false);
    setStopDuration(0);
    saveSetting('stopTimestamp', newTimestamp);
    saveSetting('stopDuration', null);
    setShowDateTimePickerModal(false);
  };
  
  const handleFrequencyChange = (value: number) => {
    setFrequency(value);
    saveSetting('frequency', value);
  };

  const formatTimestamp = (timestamp: number | null) => {
    if (!timestamp) return t('common.notSet') || 'Not Set';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.content}>
        {/* Never Stop Setting */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>
            {t('settings.subautohit.neverStop') || 'Never Stop'}
          </Text>
          <Switch
            value={neverStopEnabled}
            onValueChange={handleNeverStopChange}
            trackColor={{ false: '#ccc', true: '#4B3F38' }}
            thumbColor={neverStopEnabled ? '#fff' : '#888'}
          />
        </View>

        {/* Stop After Duration */}
        {!neverStopEnabled && (
            <View style={[styles.section, { opacity: neverStopEnabled ? 0.5 : 1 }]}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                    {t('settings.subautohit.stopAfter') || 'Stop After'}: {stopDuration} {t('common.minutes') || 'minutes'}
                    </Text>
                </View>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                    style={[styles.durationButton, styles.buttonBorder]}
                    onPress={() => handleStopDurationChange(Math.max(1, stopDuration - 1))}
                    disabled={neverStopEnabled}
                    >
                    <Text style={styles.durationButtonText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                    style={[styles.durationButton, styles.buttonBorder]}
                    onPress={() => handleStopDurationChange(Math.min(60, stopDuration + 1))}
                    disabled={neverStopEnabled}
                    >
                    <Text style={styles.durationButtonText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
        )}
        
        {/* Stop At Date/Time */}
        {!neverStopEnabled && (
            <View style={[styles.section, { opacity: neverStopEnabled ? 0.5 : 1 }]}>
                <View style={styles.labelContainer}>
                    <Text style={styles.label}>
                    {t('settings.subautohit.stopAt') || 'Stop At'}: {formatTimestamp(stopTimestamp)}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.dateButton, styles.buttonBorder]}
                    onPress={() => {
                    setTempDate(new Date(stopTimestamp || Date.now()));
                    setShowDateTimePickerModal(true);
                    }}
                    disabled={neverStopEnabled}
                >
                    <Text style={styles.dateButtonText}>
                    {t('settings.subautohit.selectDateTime') || 'Select Date & Time'}
                    </Text>
                </TouchableOpacity>
            </View>
        )}

        {/* Frequency */}
        <View style={styles.section}>
          <View style={styles.labelContainer}>
            <Feather name="clock" size={width * 0.055} color="#4B3F38" />
            <Text style={styles.label}>
              {t('settings.frequencyLabel')} ({frequency} {t('settings.seconds')})
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={frequency}
            onValueChange={setFrequency}
            onSlidingComplete={handleFrequencyChange}
            minimumTrackTintColor="#8B4513"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#4B3F38"
          />
        </View>

        {/* Custom Date Time Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDateTimePickerModal}
          onRequestClose={() => setShowDateTimePickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: bgColor }]}>
              <Text style={styles.modalTitle}>
                {t('settings.subautohit.pickDateTime') || 'Pick Date & Time'}
              </Text>
              <View style={styles.pickerContainer}>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>{t('common.year') || 'Year'}</Text>
                  <View style={styles.pickerWrapper}>
                    <TouchableOpacity onPress={() => changeTempDate('year', 1)}>
                      <Feather name="chevron-up" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDate.getFullYear()}</Text>
                    <TouchableOpacity onPress={() => changeTempDate('year', -1)}>
                      <Feather name="chevron-down" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>{t('common.month') || 'Month'}</Text>
                  <View style={styles.pickerWrapper}>
                    <TouchableOpacity onPress={() => changeTempDate('month', 1)}>
                      <Feather name="chevron-up" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDate.getMonth() + 1}</Text>
                    <TouchableOpacity onPress={() => changeTempDate('month', -1)}>
                      <Feather name="chevron-down" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>{t('common.day') || 'Day'}</Text>
                  <View style={styles.pickerWrapper}>
                    <TouchableOpacity onPress={() => changeTempDate('day', 1)}>
                      <Feather name="chevron-up" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDate.getDate()}</Text>
                    <TouchableOpacity onPress={() => changeTempDate('day', -1)}>
                      <Feather name="chevron-down" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>{t('common.hour') || 'Hour'}</Text>
                  <View style={styles.pickerWrapper}>
                    <TouchableOpacity onPress={() => changeTempDate('hour', 1)}>
                      <Feather name="chevron-up" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDate.getHours()}</Text>
                    <TouchableOpacity onPress={() => changeTempDate('hour', -1)}>
                      <Feather name="chevron-down" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.pickerColumn}>
                  <Text style={styles.pickerLabel}>{t('common.minute') || 'Minute'}</Text>
                  <View style={styles.pickerWrapper}>
                    <TouchableOpacity onPress={() => changeTempDate('minute', 1)}>
                      <Feather name="chevron-up" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                    <Text style={styles.pickerValue}>{tempDate.getMinutes()}</Text>
                    <TouchableOpacity onPress={() => changeTempDate('minute', -1)}>
                      <Feather name="chevron-down" size={24} color="#4B3F38" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.modalButtonRow}>
                <TouchableOpacity style={[styles.modalButton, styles.buttonBorder]} onPress={() => setShowDateTimePickerModal(false)}>
                  <Text style={styles.modalButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.buttonBackground]} onPress={handleStopDateChange}>
                  <Text style={[styles.modalButtonText, { color: '#fff' }]}>{t('common.set') || 'Set'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  toggleRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  section: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B3F38',
    marginLeft: 8,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  durationButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B3F38',
  },
  dateButton: {
    marginTop: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B3F38',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#4B3F38',
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  pickerColumn: {
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#4B3F38',
  },
  pickerWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  pickerValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 5,
    color: '#4B3F38',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4B3F38',
  },
  buttonBorder: {
    borderColor: '#4B3F38',
  },
  buttonBackground: {
    backgroundColor: '#4B3F38',
  },
  slider: {
    width: '100%',
    height: 40,
  }
});