# Zeno Mobile App

A modern, minimalist React Native + Expo application with ultra-clean iOS design following Apple's Human Interface Guidelines.

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation (Native Stack)
- **HTTP Client**: Axios with interceptors
- **Secure Storage**: expo-secure-store
- **Styling**: React Native StyleSheet with Theme Context
- **State Management**: React Context API

## Features

✨ **Modern UI/UX**
- Pure white (#FFFFFF) light mode background
- Pure black (#000000) dark mode background
- iOS-style pill-shaped buttons with subtle shadows
- System font typography (San Francisco equivalent)
- Smooth transitions between screens
- Native-feeling press interactions with opacity changes

🔐 **Secure Authentication**
- Token-based auth with access and refresh tokens
- Secure token storage using expo-secure-store (NOT AsyncStorage)
- Automatic token refresh on 401 responses
- Seamless retry of failed requests after token refresh

📱 **App States**
1. **Onboarding**: 4 smooth screens explaining the app value
2. **Auth**: Login and Signup screens with form validation
3. **Main App**: Authenticated dashboard

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (for Mac) or Android Emulator

### Step 1: Install Dependencies

```bash
cd zeno-frontend
npm install
```

### Step 2: Configure Backend URL

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Update the API base URL if your backend is running on a different address:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

### Step 3: Start the Development Server

```bash
# Start Expo dev server
npm start

# For iOS
npm run ios

# For Android
npm run android

# For Web
npm run web
```

## Project Structure

```
src/
├── api/
│   ├── axiosClient.ts       # Axios instance with 401 interceptor
│   └── authApi.ts           # Auth API calls
├── components/
│   ├── Button.tsx           # Reusable iOS-style button
│   └── Input.tsx            # Reusable iOS-style text input
├── navigation/
│   ├── AppNavigator.tsx     # Main navigation orchestrator
│   ├── AuthStack.tsx        # Auth flow navigation
│   ├── MainStack.tsx        # Main app navigation
│   └── OnboardingStack.tsx  # Onboarding flow navigation
├── screens/
│   ├── Onboarding/
│   │   ├── OnboardingScreen1.tsx
│   │   ├── OnboardingScreen2.tsx
│   │   ├── OnboardingScreen3.tsx
│   │   └── OnboardingScreen4.tsx
│   ├── Auth/
│   │   ├── LoginScreen.tsx
│   │   └── SignupScreen.tsx
│   └── Dashboard/
│       └── DashboardScreen.tsx
├── store/
│   └── AuthContext.tsx      # Auth state management
└── theme/
    ├── colors.ts            # Light/Dark mode color palettes
    └── ThemeContext.tsx     # Theme provider
```

## Backend Integration

### Expected Auth Endpoints

Your Spring Boot API Gateway should expose:

```
POST /api/auth/signup
Body: { fname, lname, email, password }
Response: { accessToken, refreshToken, message }

POST /api/auth/login
Body: { email, password }
Response: { accessToken, refreshToken, message }

POST /api/auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken, message }
```

### Token Handling

1. **Login/Signup Response**: Both tokens are immediately saved to `expo-secure-store`
2. **Request Interceptor**: Automatically attaches `Authorization: Bearer {accessToken}` to all requests
3. **401 Response**: 
   - Interceptor catches 401 errors
   - Fetches new accessToken using refreshToken
   - Saves new tokens
   - Retries original request
   - If refresh fails, user is logged out

## Development

### Onboarding Flow

Users see 4 onboarding screens on first launch:
1. Welcome screen
2. Security features
3. Performance features
4. Get started (button leads to login)

Once "Get Started" is pressed, the flag is saved and users proceed to auth.

### Authentication Flow

- New users: Signup with first name, last name, email, password
- Existing users: Login with email and password
- Tokens: Stored securely and managed automatically
- Session: Persists across app restarts if tokens are valid

### Error Handling

- Form validation on auth screens
- Network error alerts
- Invalid token handling with automatic logout
- User-friendly error messages

## Styling & Theme

### Light Mode
- Background: #FFFFFF (pure white)
- Text: #000000 (pure black)
- Buttons: Black buttons with white text
- Shadows: Subtle shadows for depth

### Dark Mode
- Background: #000000 (pure black)
- Text: #FFFFFF (pure white)
- Buttons: White buttons with black text
- Shadows: Subtle shadows for depth

Toggle between light/dark mode using system settings.

## API Client Configuration

The Axios client is pre-configured with:
- Base URL pointing to your backend
- Request timeout of 10 seconds
- Automatic token attachment to requests
- Advanced interceptor for 401 handling and token refresh
- JSON content-type header

## Secure Token Storage

Tokens are stored using `expo-secure-store` which:
- Encrypts data on the device
- Uses iOS Keychain (iOS) and Android Keystore (Android)
- Survives app restarts
- Cannot be accessed by other apps

## Common Tasks

### Add a New Screen

1. Create the screen component in `src/screens/`
2. Add the route to the appropriate stack in `src/navigation/`
3. Use `useTheme()` for consistent styling
4. Use `useAuth()` if authentication is needed

### Add a New API Endpoint

1. Create a new function in `src/api/authApi.ts` or create a new file
2. Use `axiosClient` for consistent interceptor behavior
3. Import in your screen component
4. Handle errors with try-catch

### Customize Colors

Edit `src/theme/colors.ts` to modify the color palette for light and dark modes.

### Debug Network Calls

Add logging in `src/api/axiosClient.ts` interceptors:

```typescript
axiosClient.interceptors.request.use((config) => {
  console.log('API Request:', config.url, config.data);
  return config;
});
```

## Troubleshooting

### "Cannot find module" errors
```bash
npm install
npm start -- --clear
```

### Tokens not persisting
- Ensure `expo-secure-store` is properly installed
- Check that your app has the necessary permissions

### Backend not responding
- Verify your backend is running on http://localhost:8080
- Check `.env` file has correct API base URL
- Ensure CORS is enabled on your backend

### Token refresh failing
- Verify the `/api/auth/refresh` endpoint exists
- Ensure the endpoint returns `accessToken` and `refreshToken`
- Check that refresh tokens haven't expired

## Build for Production

### iOS
```bash
eas build --platform ios
```

### Android
```bash
eas build --platform android
```

## License

[Your License Here]

## Support

For issues or questions, please create an issue in the repository.
