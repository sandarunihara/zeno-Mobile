import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/Dashboard/DashboardScreen';
import HealthScreen from '../screens/Health/HealthScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import SubscriptionGhostbusterScreen from '../screens/Ghostbuster/SubscriptionGhostbusterScreen';
import { useTheme } from '../theme/ThemeContext';
import { BottomNavigation } from '../components/BottomNavigation';

const Tab = createBottomTabNavigator();

const MainStack: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
      tabBar={(props) => <BottomNavigation {...props} />}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
      />
      <Tab.Screen
        name="Health"
        component={HealthScreen}
      />
      <Tab.Screen
        name="Ghostbuster"
        component={SubscriptionGhostbusterScreen}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
};

export default MainStack;

