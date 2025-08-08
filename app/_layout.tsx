import { Stack } from 'expo-router';
import React from 'react';

/**
 * This is the root navigator for the app.
 * It uses a Stack to manage the main Tab navigator and any app-wide modals.
 */
export default function RootLayout() {
  return (
    <Stack>
      {/* The main screen is the Tab navigator, which is defined in the (tabs) group. */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* Define the modal screen at the root level. */}
      {/*<Stack.Screen
        name="autohit-settings"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />*/}
    </Stack>
  );
}
