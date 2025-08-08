import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { BarChart } from 'react-native-chart-kit';
import { LanguageCode } from '../translations';
import { useLocalization } from '../useLocalization';


const STORAGE_KEY = 'daily_hits';
const { width } = Dimensions.get('window');
const chartWidth = width - 32;

// Define the data structures
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

// For the flattened list view
interface ListHitRecord extends HitRecord {
  date: string;
}

export default function StatisticsScreen() {
  const { t, language } = useLocalization();
  const [view, setView] = useState<'list' | 'calendar'>('calendar');
  const [hitData, setHitData] = useState<AllHitsData>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bgColor, setBgColor] = useState('#F5F5DC');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  useFocusEffect(
    useCallback(() => {
      const loadSettings = async () => {
        const stored = await AsyncStorage.getItem('@user_settings');
        if (stored) {
          const settings = JSON.parse(stored);
          if (settings.bgColor) setBgColor(settings.bgColor);
        }
      };
      loadSettings();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      loadHitData();
    }, [])
  );

  useEffect(() => {
    const localeStrings = t('calendar') as any;

    const isValidCalendarObject =
      localeStrings &&
      Array.isArray(localeStrings.months) &&
      Array.isArray(localeStrings.monthShort) &&
      Array.isArray(localeStrings.dayNames) &&
      Array.isArray(localeStrings.dayNamesShort);

    if (isValidCalendarObject) {
      LocaleConfig.locales[language as LanguageCode] = {
        monthNames: localeStrings.months,
        monthNamesShort: localeStrings.monthShort,
        dayNames: localeStrings.dayNames,
        dayNamesShort: localeStrings.dayNamesShort,
      };
      LocaleConfig.defaultLocale = language as LanguageCode;
    } else {
      console.warn('[Calendar Locale] Invalid or missing calendar object for:', language, localeStrings);
    }
  }, [language, t]);

  const loadHitData = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHitData(JSON.parse(stored));
      } else {
        setHitData({});
      }
    } catch (e) {
      console.error('Failed to load hit data', e);
    }
  };

  const saveHitData = async (data: AllHitsData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setHitData(data);
    } catch (e) {
      console.error('Failed to save hit data', e);
    }
  };

  const deleteEntry = (date: string, timestamp: number) => {
    const updatedData = { ...hitData };
    const dayData = updatedData[date];

    if (dayData) {
      const hitToDelete = dayData.hits.find(h => h.timestamp === timestamp);
      if (!hitToDelete) return;

      // Subtract from total and filter out the hit
      dayData.total -= hitToDelete.count;
      dayData.hits = dayData.hits.filter(h => h.timestamp !== timestamp);

      // If no hits are left for the day, remove the entire day's entry
      if (dayData.hits.length === 0) {
        delete updatedData[date];
      } else {
        updatedData[date] = dayData;
      }

      saveHitData(updatedData);
    }
  };

  const confirmDeleteEntry = (date: string, timestamp: number) => {
    Alert.alert(
      t('statistics.deleteConfirmationTitle'),
      t('statistics.deleteConfirmationMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.confirm'), style: 'destructive', onPress: () => deleteEntry(date, timestamp) },
      ],
      { cancelable: true }
    );
  };

  const markedDates = Object.keys(hitData).reduce((acc, date) => {
    acc[date] = {
      marked: true,
      dotColor: 'blue',
      selected: date === selectedDate,
      selectedColor: date === selectedDate ? '#b2dfdb' : undefined,
    };
    return acc;
  }, {} as any);

  const currentMonthDates = Object.keys(hitData).filter(date => date.startsWith(selectedMonth));
  const weekSums: number[] = [0, 0, 0, 0, 0];
  currentMonthDates.forEach(date => {
    const day = parseInt(date.split('-')[2], 10);
    const weekIndex = Math.min(4, Math.floor((day - 1) / 7));
    weekSums[weekIndex] += hitData[date]?.total || 0; // Use the total for the chart
  });

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    if (hitData[date] && hitData[date].total > 0) {
      setSelectedDate(date);
      setModalVisible(true);
    } else {
      setSelectedDate(null);
    }
  };

  // ✅ FIX: Added a defensive check to handle old data formats and prevent crashing.
  const flattenedHits: ListHitRecord[] = Object.entries(hitData)
    .flatMap(([date, data]) => {
      // Defensively check if data is in the expected format before mapping
      if (data && Array.isArray(data.hits)) {
        return data.hits.map(hit => ({ ...hit, date }));
      }
      // If the data for a date is not in the correct format (e.g., old data), return an empty array
      return [];
    })
    .sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first

  const iconColor = "#4B3F38";
  const iconSize = width * 0.055;

  useEffect(() => {
    if (modalVisible) {
      const timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setModalVisible(false);
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [modalVisible]);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}><Feather name="bar-chart-2" size={iconSize} color={iconColor} />{t('statistics.title')}</Text>
        <View style={styles.switchContainer}>
          <Feather name="calendar" size={20} color="#333" />
          <Switch
            value={view === 'list'}
            onValueChange={(val) => setView(val ? 'list' : 'calendar')}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
          <Feather name="list" size={20} color="#333" />
        </View>
      </View>

      {view === 'calendar' ? (
        <View style={styles.chartContainer}>
          <Calendar
            markedDates={markedDates}
            onDayPress={handleDayPress}
            onMonthChange={(month) => {
              const newMonth = `${month.year}-${String(month.month).padStart(2, '0')}`;
              setSelectedMonth(newMonth);
            }}
            style={{ width: chartWidth, borderRadius: 8, elevation: 2, marginBottom: 16 }}
          />
          <BarChart
            data={{
              labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
              datasets: [{ data: weekSums }],
            }}
            width={chartWidth}
            height={220}
            fromZero
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={{
              backgroundColor: '#fefefe',
              backgroundGradientFrom: '#e0f2f1',
              backgroundGradientTo: '#b2dfdb',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(0, 77, 64, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 51, 38, ${opacity})`,
              style: { borderRadius: 12 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#00796b',
              },
            }}
            style={{ borderRadius: 12, paddingVertical: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }}
          />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          data={flattenedHits}
          keyExtractor={(item) => item.timestamp.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View>
                <Text style={styles.listItemText}>
                  <Feather name="calendar" size={16} /> {item.date}
                </Text>
                <Text style={styles.listItemText}>
                  <Feather name="target" size={16} /> {item.count}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmDeleteEntry(item.date, item.timestamp)}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={20} color="white" />
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyListText}>{t('statistics.noData')}</Text>}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.halfScreenModal}>
            <Animated.View style={[styles.modalInnerContent, { opacity: fadeAnim }]}>
              {!imageLoaded && (
                <ActivityIndicator size="small" color="#ffd700" />
              )}
              <Image
                source={require('../../assets/images/buddha-bg.png')}
                style={styles.halfScreenImage}
                resizeMode="cover"
                onLoad={() => {
                  setImageLoaded(true);
                  Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                  }).start();
                }}
              />
              {imageLoaded && (
                <View style={styles.textContainer}>
                  <Text style={styles.dateText}>{selectedDate}</Text>
                  <Text style={styles.modalCount}>
                    <Feather name="target" size={20} color="#ffd700" />{' '}
                    {selectedDate ? hitData[selectedDate]?.total || 0 : 0}
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 15,
    paddingHorizontal: 6,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#403220',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#fff',
    shadowOpacity: 0.8,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  listItemText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    marginBottom: 4,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 20,
  },
  emptyListText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  halfScreenModal: {
    width: '90%',
    height: '60%', // Increased height
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalInnerContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },

  halfScreenImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    bottom: 30,
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalCount: {
    fontSize: 22,
    color: '#ffd700',
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '80%', // Wider modal (90% of screen width)
    alignSelf: 'center', // Center it horizontally
  },

  buddhaImage: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  closeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  closeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});