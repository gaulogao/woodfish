import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { BarChart } from 'react-native-chart-kit';
import ViewShot from 'react-native-view-shot';
import { LanguageCode } from '../translations';
import { useLocalization } from '../useLocalization';

const STORAGE_KEY = 'daily_hits';
const { width } = Dimensions.get('window');
const { height } = Dimensions.get('window');
const chartWidth = width - 32;

// Define the data structures
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

// For the flattened list view
interface ListHitRecord extends HitRecord {
  date: string;
}

export default function StatisticsScreen() {
  const { t, language } = useLocalization();
  const [view, setView] = useState<'calendar' | 'list'>('calendar'); // ✅ State remains the same
  const [hitData, setHitData] = useState<AllHitsData>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bgColor, setBgColor] = useState('#000');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [selectedPrayWords, setSelectedPrayWords] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'single' | 'daily' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ListHitRecord | null>(null);

  const viewRef = useRef(null);

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

      dayData.total -= hitToDelete.count;
      dayData.hits = dayData.hits.filter(h => h.timestamp !== timestamp);

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
    weekSums[weekIndex] += hitData[date]?.total || 0;
  });

  const handleDayPress = (day: { dateString: string }) => {
    const date = day.dateString;
    if (hitData[date] && hitData[date].total > 0) {
      const index = Math.floor(Math.random() * buddhaImages.length);
      setSelectedImage(buddhaImages[index]);
      setSelectedDate(date);
      setModalType('daily');
      setModalVisible(true);
    } else {
      setSelectedDate(null);
    }
  };

  const flattenedHits: ListHitRecord[] = Object.entries(hitData)
    .flatMap(([date, data]) => {
      if (data && Array.isArray(data.hits)) {
        return data.hits.map(hit => ({ ...hit, date }));
      }
      return [];
    })
    .sort((a, b) => b.timestamp - a.timestamp);

  const iconColor = "#4B3F38";
  const iconSize = width * 0.08;

  const handleExportImage = async () => {
    if (viewRef.current) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('common.permissionRequired'), t('common.photoPermissionMessage'));
          return;
        }

        const uri = await ViewShot.captureRef(viewRef, {
          format: 'jpg',
          quality: 0.9,
        });

        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert(
          t('common.success'),
          t('statistics.imageExportSuccess'),
          [
            {
              text: t('common.confirm'),
              onPress: () => { },
            },
          ]
        );
      } catch (error) {
        console.error('Failed to export image', error);
        Alert.alert(t('common.error'), t('statistics.imageExportFail'));
      }
    } else {
      Alert.alert('Error', 'Modal content is not ready to be captured. Please try again.');
    }
  };

  const handleShareImage = async () => {
    if (viewRef.current) {
      try {
        const uri = await ViewShot.captureRef(viewRef, {
          format: 'jpg',
          quality: 0.9,
        });

        const localUri = `${FileSystem.cacheDirectory}shared-image.jpg`;
        await FileSystem.copyAsync({ from: uri, to: localUri });

        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          Alert.alert(t('common.error'), t('statistics.shareNotAvailable'));
          return;
        }

        // ✅ This is where you share the image
        await Sharing.shareAsync(localUri);

      } catch (error) {
        console.error('Failed to share image', error);
        Alert.alert(t('common.error'), t('statistics.imageShareFail'));
      }
    } else {
      Alert.alert('Error', 'Modal content is not ready to be shared. Please try again.');
    }
  };

  const buddhaImages = [
    require('../../assets/images/buddha/buddha-1.png'),
    require('../../assets/images/buddha/buddha-2.png'),
    require('../../assets/images/buddha/buddha-3.png'),
    require('../../assets/images/buddha/buddha-4.png'),
    require('../../assets/images/buddha/buddha-5.png'),
    require('../../assets/images/buddha/buddha-6.png'),
    require('../../assets/images/buddha/buddha-7.png'),
    require('../../assets/images/buddha/buddha-8.png'),
    require('../../assets/images/buddha/buddha-9.png'),
    require('../../assets/images/buddha/buddha-10.png'),
    require('../../assets/images/buddha/buddha-11.png'),
  ];
  const [selectedImage, setSelectedImage] = useState(buddhaImages[0]);


  const randomImage = useMemo(() => {
    const index = Math.floor(Math.random() * buddhaImages.length);
    return buddhaImages[index];
  }, []);


  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ✅ MODIFIED: The header now uses the SegmentedControl */}
      <View style={styles.headerRow}>
        <Text style={styles.title}><Feather name="bar-chart-2" size={iconSize} color={iconColor} />{t('statistics.title')}</Text>
      </View>
      <View style={styles.segmentedControlContainer}>
        <View style={styles.customSegmentedControl}>
          {[
            { key: 'calendar', label: t('statistics.calendarView') || 'Calendar', icon: 'calendar' },
            { key: 'list', label: t('statistics.listView') || 'List', icon: 'list' },
          ].map((tab) => {
            const isActive = view === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.segmentButton,
                  { backgroundColor: isActive ? '#8B4513' : '#F5F5DC' },
                ]}
                onPress={() => setView(tab.key as 'calendar' | 'list')}
              >
                <Feather
                  name={tab.icon}
                  size={18}
                  color={isActive ? '#F5F5DC' : '#4B3F38'}
                  style={{ marginRight: 6 }}
                />
                <Text style={{ color: isActive ? '#F5F5DC' : '#4B3F38', fontWeight: '600' }}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>


      {view === 'calendar' ? (
        <ScrollView contentContainerStyle={styles.chartContainer}>
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
        </ScrollView>
      ) : (
        <FlatList
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
          data={flattenedHits}
          keyExtractor={(item) => item.timestamp.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                const index = Math.floor(Math.random() * buddhaImages.length);
                setSelectedImage(buddhaImages[index]);
                setSelectedItem(item);
                setSelectedPrayWords(item.prayWords);
                setSelectedDate(item.date);
                setModalType('single');
                setModalVisible(true);
              }}

              style={styles.cardItem}
            >
              <View style={styles.cardColumn}>
                <View style={styles.cardRow}>
                  <Feather name="calendar" size={18} color="#4A90E2" />
                  <Text style={styles.cardText}>{item.date}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Feather name="target" size={18} color="#4A90E2" />
                  <Text style={styles.cardText}>{item.count}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => confirmDeleteEntry(item.date, item.timestamp)}
                style={styles.deleteButton}
              >
                <Feather name="trash-2" size={20} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyListText}>{t('statistics.noData')}</Text>}
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedPrayWords(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.halfScreenModal}>


            <Animated.View style={[styles.modalInnerContent, { opacity: fadeAnim }]} ref={viewRef}>

              {!imageLoaded && (
                <ActivityIndicator size="small" color="#ffd700" />
              )}
              <Image
                source={selectedImage}
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
                    {modalType === 'daily'
                      ? (selectedDate ? hitData[selectedDate]?.total || 0 : 0)
                      : (selectedItem ? selectedItem.count || 0 : 0)}
                  </Text>
                </View>
              )}
              {modalType === 'single' && selectedItem?.prayWords && (
                <View style={styles.prayWordsContainer}>
                  <Text style={styles.prayWordsLabel}>🙏 {t('settings.prayWords') || 'Prayer Words'}</Text>
                  <Text style={styles.prayWordsText}>
                    “{selectedItem.prayWords}”
                  </Text>
                </View>
              )}
              {modalType === 'daily' && selectedDate && hitData[selectedDate]?.hits?.length > 0 && (
                <View style={styles.dailyPrayWordsWrapper}>
                  {hitData[selectedDate].hits.map((hit, index) => (
                    hit.prayWords ? (
                      <View key={index} style={styles.prayWordsContainer}>
                        <Text style={styles.prayWordsLabel}>🕊️ {t('settings.prayWords') || 'Prayer Words'}</Text>
                        <Text style={styles.prayWordsText}>
                          “{hit.prayWords}”
                        </Text>
                      </View>
                    ) : null
                  ))}
                </View>
              )}
            </Animated.View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalExportIcon} onPress={handleExportImage}>
                <Feather name="download" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalExportIcon} onPress={handleShareImage}>
                <Feather name="share-2" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
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
    marginTop: 20, // Add margin to separate from the segmented control
  },
  headerRow: {
    justifyContent: 'center', // Center the title
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    color: '#fff',
  },
  // ✅ NEW: Style for the segmented control container
  segmentedControlContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
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
    width: '100%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
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
  cardItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardColumn: {
    flexDirection: 'column',
    justifyContent: 'center',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 24,
  },
  cardText: {
    fontSize: 16,
    color: '#F5F5DC',
    fontWeight: '500',
    marginLeft: 8,
    lineHeight: 20,
  },
  dailyPrayWordsWrapper: {
    marginTop: 12,
    paddingHorizontal: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',     // ✅ Center horizontally
    alignItems: 'center',         // ✅ Center vertically
  },

  prayWordsContainer: {
    marginBottom: 16,
    marginLeft: 5,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd700',
    alignSelf: 'center',
    maxWidth: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  prayWordsLabel: {
    fontSize: 14,
    color: '#ffd700',
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prayWordsText: {
    fontSize: 16,
    color: '#ffffff',
    fontStyle: 'italic',
    textAlign: 'left',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  modalInnerContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#000000',
  },

  modalButtonRow: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },


  modalExportIcon: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 24,
    marginLeft: 10,
  },


  customSegmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },

});
