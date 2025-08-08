// app/(tabs)/settings/_layout.tsx
// This file defines the nested stack navigator for the "Settings" tab.

import { Stack } from 'expo-router';
import { useLocalization } from '../../useLocalization';
export default function SettingsStackLayout() {
  const { t } = useLocalization();
  return (
    <Stack>
      {/*
        The index screen of this stack will be your renamed settings/index.tsx.
        The autohit-settings screen is a sibling within this stack.
      */}
      <Stack.Screen name="index" options={{ headerShown: false, title: t('common.back') }} />
      <Stack.Screen name="autohit-settings" options={{ title: t('settings.autohitTitle') }} />
    </Stack>
  );
}