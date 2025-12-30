import React from 'react';
import { Redirect } from 'expo-router';

export default function NotificationsScreen(): React.ReactElement {
  return <Redirect href="/(tabs)/notifications" />;
}
