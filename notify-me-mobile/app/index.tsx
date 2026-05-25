import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/colors';
import { useEffect, useState } from 'react';

export default function RootIndex() {
  const { user, loading } = useSelector((state: RootState) => state.auth);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait a brief moment for Redux to rehydrate if using redux-persist
    // or just to ensure auth state is loaded.
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady || loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Redirect to app if logged in, otherwise auth
  if (user) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
