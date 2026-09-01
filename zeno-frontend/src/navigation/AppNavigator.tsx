import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import AuthStack from './AuthStack';
import MainStack from './MainStack';
import OnboardingStack from './OnboardingStack';
import AllTasksScreen from '../screens/Dashboard/AllTasksScreen';
import TaskDetailScreen from '../screens/Dashboard/TaskDetailScreen';
import SocialBatteryScreen from '../screens/Ghostbuster/SocialBatteryScreen';

const Stack = createNativeStackNavigator();

// Standalone loading screen — rendered as a Stack.Screen so the navigator
// is always mounted inside NavigationContainer (prevents "no navigation context" errors)
const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.button} />
    </View>
  );
};

const AppNavigator: React.FC = () => {
  const { isLoggedIn, isLoading, onboardingComplete } = useAuth();
  const { theme } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      {isLoading ? (
        // Keep a screen in the navigator during auth check so navigation context is always valid
        <Stack.Screen name="Loading" component={LoadingScreen} />
      ) : !onboardingComplete ? (
        <Stack.Screen name="OnboardingStack" component={OnboardingStack} />
      ) : isLoggedIn ? (
        <Stack.Group>
          <Stack.Screen name="MainStack" component={MainStack} />
          <Stack.Screen name="AllTasks" component={AllTasksScreen} />
          <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
          <Stack.Screen name="SocialBattery" component={SocialBatteryScreen} />
        </Stack.Group>
      ) : (
        <Stack.Screen name="AuthStack" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
