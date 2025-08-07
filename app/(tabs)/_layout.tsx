import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { DeviceEventEmitter, StatusBar } from 'react-native';
import { useLocalization } from '../useLocalization';

export default function TabLayout() {
  const [bgColor, setBgColor] = useState('#F5F5DC');
  const { t } = useLocalization();

  const loadSettings = async () => {
    const stored = await AsyncStorage.getItem('@user_settings');
    if (stored) {
      const settings = JSON.parse(stored);
      if (settings.bgColor) {
        setBgColor(settings.bgColor);
      }
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadSettings();
    }, [])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('settingsChanged', (data) => {
      if (data?.bgColor) {
        setBgColor(data.bgColor);
      }
    });
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#CD853F',
          tabBarInactiveTintColor: '#4B3F38',
          tabBarStyle: {
            backgroundColor: bgColor,
            borderTopWidth: 0,
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
          },
          headerShown: false,
          contentStyle: { backgroundColor: bgColor },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.recitation'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stopwatch-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="statistics"
          options={{
            title: t('tabs.statistics'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="bar-chart-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
        {/* This defines the new screen as a modal that is not visible in the tab bar */}
        <Tabs.Screen
          name="autohit-settings"
          options={{
            href: null, // This hides the screen from the tab bar
            presentation: 'modal', // This makes it float over the current screen
            headerShown: false, // We use a custom header in the screen component
          }}
        />
      </Tabs>
    </>
  );
}
