# Zeno Mobile App - Complete Setup Guide

## Prerequisites

Before you begin, make sure you have:

1. **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
2. **npm** or **yarn** (comes with Node.js)
3. **Expo CLI** - Install globally with: `npm install -g expo-cli`
4. **iOS Simulator** (Mac only) or **Android Emulator**
5. **Your Spring Boot backend running** on `http://localhost:8080`

## Step-by-Step Installation

### 1. Navigate to the Project

```bash
cd "e:\Work\Own Projects\Zeno Mobile App\zeno-frontend"
```

### 2. Install Dependencies

```bash
npm install
```

This will install:
- React Native & Expo
- React Navigation
- Axios
- expo-secure-store
- All TypeScript types

**If you encounter any issues during installation:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Windows PowerShell
echo "EXPO_PUBLIC_API_BASE_URL=http://localhost:8080" > .env

# macOS/Linux
echo "EXPO_PUBLIC_API_BASE_URL=http://localhost:8080" > .env
```

Or manually create `.env` with:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

### 4. Verify Backend is Running

Make sure your Spring Boot API Gateway is running:

```bash
# Backend should be accessible at:
# http://localhost:8080/api/auth/login
# http://localhost:8080/api/auth/signup
# http://localhost:8080/api/auth/refresh
```

Test it with:
```bash
curl http://localhost:8080/api/health
```

### 5. Start the Development Server

```bash
npm start
```

You should see:
```
Connected to Metro on http://localhost:19002 and watching for file changes.

 ›   You can scan the QR code above with Expo Go or press the following:
 ›   • Press "a" to open Android Emulator
 ›   • Press "i" to open iOS Simulator
 ›   • Press "w" to open web preview
```

### 6. Run on Your Device/Emulator

Choose one:

```bash
# Run on iOS Simulator (macOS only)
npm run ios

# Run on Android Emulator
npm run android

# Run on Web Browser
npm run web

# Or use the interactive prompt:
npm start
```

Press `a` for Android, `i` for iOS, or `w` for Web.

## Testing the Application

### Onboarding Flow

1. **First Launch**: You'll see 4 onboarding screens
   - Welcome screen
   - Security features
   - Performance
   - Get started screen
2. **Click "Get Started"**: Proceeds to authentication

### Authentication Flow

#### Sign Up
1. Fill in:
   - First Name
   - Last Name
   - Email (must be valid format)
   - Password (minimum 6 characters)
   - Confirm Password (must match)
2. Click "Create Account"
3. Wait for API response

#### Log In
1. Enter your email and password
2. Click "Sign In"
3. On success, you'll be taken to the dashboard

### Testing Token Refresh

To test the 401 interceptor and token refresh:

1. **Inspect SecureStore** (during debugging):
   ```bash
   # This stores: accessToken, refreshToken, onboarding_complete
   ```

2. **Trigger a 401**: Configure your backend to return 401, then make a request
3. **Watch the interceptor**: 
   - Grabs refreshToken from SecureStore
   - Calls `/api/auth/refresh`
   - Saves new accessToken
   - Retries original request

## File Structure Explained

```
zeno-frontend/
├── App.tsx                          # Main app entry point
├── app.json                         # Expo configuration
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── babel.config.js                  # Babel transform config
├── metro.config.js                  # Metro bundler config
├── .env.example                     # Environment template
├── .gitignore                       # Git ignore rules
├── .env                             # Your environment (not in git)
│
└── src/
    ├── api/
    │   ├── axiosClient.ts           # HTTP client with interceptors
    │   │   - Request: Adds accessToken
    │   │   - Response: Handles 401 with token refresh
    │   └── authApi.ts               # API methods (login, signup, refresh)
    │
    ├── components/
    │   ├── Button.tsx               # Reusable button (primary/secondary)
    │   │   - Props: title, onPress, loading, variant
    │   │   - Styles: Pill-shaped, shadows, opacity on press
    │   └── Input.tsx                # Reusable text input
    │       - Props: placeholder, value, secureTextEntry, error
    │       - Features: Focus state, password toggle with eye icon
    │
    ├── navigation/
    │   ├── AppNavigator.tsx         # Main orchestrator
    │   │   - Switches between OnboardingStack, AuthStack, MainStack
    │   │   - Shows loading indicator while checking auth status
    │   ├── OnboardingStack.tsx      # Onboarding flow (4 screens)
    │   ├── AuthStack.tsx            # Auth flow (Login & Signup)
    │   └── MainStack.tsx            # Main app (Dashboard)
    │
    ├── screens/
    │   ├── Onboarding/
    │   │   ├── OnboardingScreen1.tsx  # Welcome
    │   │   ├── OnboardingScreen2.tsx  # Security
    │   │   ├── OnboardingScreen3.tsx  # Performance
    │   │   └── OnboardingScreen4.tsx  # Get Started (calls completeOnboarding)
    │   │
    │   ├── Auth/
    │   │   ├── LoginScreen.tsx       # Email + Password login
    │   │   │  - Form validation
    │   │   │  - Error display
    │   │   │  - Link to Signup
    │   │   └── SignupScreen.tsx      # Registration form
    │   │      - First/Last name, Email, Password, Confirm Password
    │   │      - Field validation
    │   │      - Link to Login
    │   │
    │   └── Dashboard/
    │       └── DashboardScreen.tsx   # Main authenticated screen
    │           - Cards with app info
    │           - Logout button
    │
    ├── store/
    │   └── AuthContext.tsx          # Global auth state
    │       - isLoggedIn: boolean
    │       - isLoading: boolean (check auth on mount)
    │       - onboardingComplete: boolean
    │       - Methods: login(), signup(), logout(), completeOnboarding()
    │
    └── theme/
        ├── colors.ts                # Light/Dark color palettes
        │  - lightColors: white bg, black text
        │  - darkColors: black bg, white text
        └── ThemeContext.tsx         # Theme provider
            - useTheme() hook
            - Automatically switches based on system preference
```

## Key Architectural Decisions

### 1. Token Storage (expo-secure-store)
- **NOT AsyncStorage** (which is unencrypted)
- Uses iOS Keychain / Android Keystore
- Survives app restarts
- Encrypted on device

### 2. Axios Interceptors
```
Request Interceptor:
  → Get accessToken from SecureStore
  → Add Authorization header
  → Send request

Response Interceptor on 401:
  → Get refreshToken from SecureStore
  → Call /api/auth/refresh
  → Save new accessToken
  → Retry original request
  → If refresh fails, logout user
```

### 3. Theme System
- Single `ThemeContext` provides colors to entire app
- Automatically switches between light/dark based on system setting
- All components use `useTheme()` hook

### 4. Navigation State Machine
```
App Launch
  ↓
Is Onboarding Complete? 
  ├─ NO  → OnboardingStack (4 screens)
  │        → User clicks "Get Started"
  │        → Calls completeOnboarding()
  │        → Moves to next state
  │
  └─ YES → Is User Logged In?
           ├─ NO  → AuthStack (Login/Signup)
           │        → User authenticates
           │        → Tokens saved to SecureStore
           │        → Updates AuthContext
           │        → Moves to next state
           │
           └─ YES → MainStack (Dashboard)
                    → User can logout  → Back to AuthStack
```

## Common Issues & Solutions

### Issue: "Cannot find module 'react-native'"
**Solution:**
```bash
npm install
npm start -- --clear
```

### Issue: "Axios is not defined"
**Solution:**
```bash
npm install axios
```

### Issue: "Backend not responding" / "Network Error"
**Solution:**
- Check backend is running: `curl http://localhost:8080/api/health`
- Check `.env` file has correct URL
- Check firewall isn't blocking localhost:8080
- On Emulator: Use `10.0.2.2:8080` instead of `localhost:8080`

### Issue: "Module not found: ThemeContext"
**Solution:**
```bash
# Full path of file should exist:
ls -la src/theme/ThemeContext.tsx
```

### Issue: Tokens not persisting after app restart
**Solution:**
- Verify `expo-secure-store` is installed: `npm list expo-secure-store`
- Check app has permission to use Secure Storage
- Clear app data and reinstall

### Issue: "Refresh token failed" / Infinite redirect
**Solution:**
- Verify `/api/auth/refresh` endpoint on backend
- Check endpoint returns `{ accessToken, refreshToken }`
- Ensure refresh tokens don't expire immediately

## Backend Integration Checklist

Your Spring Boot API Gateway must have:

- [ ] `POST /api/auth/signup`
  - Input: `{ fname, lname, email, password }`
  - Output: `{ accessToken, refreshToken, message }`

- [ ] `POST /api/auth/login`
  - Input: `{ email, password }`
  - Output: `{ accessToken, refreshToken, message }`

- [ ] `POST /api/auth/refresh`
  - Input: `{ refreshToken }`
  - Output: `{ accessToken, refreshToken, message }`

- [ ] CORS enabled for `http://localhost:19000` and `http://localhost:19001` (Expo)

- [ ] (Optional) `GET /health` for connectivity check

### CORS Configuration Example (Spring Boot)

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                    .allowedOrigins("http://localhost:19000", "http://localhost:19001")
                    .allowedMethods("*")
                    .allowedHeaders("*");
            }
        };
    }
}
```

## Development Tips

### 1. Enable Network Debugging
Add to `axiosClient.ts`:
```typescript
axiosClient.interceptors.request.use((config) => {
  console.log('🚀 API Request:', config.url, config.data);
  return config;
});

axiosClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);
```

### 2. Test Specific Screens
In `AppNavigator.tsx`, temporarily comment out state checks:
```typescript
// For testing auth screens:
// return <AuthStack />;

// For testing dashboard:
// return <MainStack />;
```

### 3. Hot Reload
Changes to JS/TS files will auto-reload. For native changes, you may need to press `r` in the terminal to reload.

### 4. Debug Console
- Press `d` when app is running
- Choose "Toggle remote debugger"
- Opens Chrome DevTools

## Production Build

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

### Considerations
- Update `app.json` with correct bundle IDs
- Upload icons and splash screens
- Configure signing certificates
- Set up app store connections

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure `.env`
3. ✅ Start backend
4. ✅ Run `npm start`
5. 📱 Test onboarding flow
6. 🔐 Test login/signup
7. 🔄 Test token refresh (make backend return 401)
8. 🎨 Customize colors in `src/theme/colors.ts`
9. 📝 Add more screens as needed
10. 🚀 Build for production

## Support & Debugging

### Logs
- Terminal shows Expo logs
- Chrome DevTools for JS console
- Xcode console for iOS
- Android Studio logcat for Android

### Clearing State
```bash
# Clear Expo cache
npm start -- --clear

# Reset SecureStore (restart app after):
# In code: await SecureStore.deleteItemAsync('accessToken');
```

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Axios Documentation](https://axios-http.com/)
- [React Native StyleSheet](https://reactnative.dev/docs/stylesheet)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)

---

**Enjoy building with Zeno! 🚀**
