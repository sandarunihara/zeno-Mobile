# Zeno Mobile App - Quick Developer Reference

## Quick Start (60 seconds)

```bash
# 1. Install dependencies
cd zeno-frontend
npm install

# 2. Create .env file
echo "EXPO_PUBLIC_API_BASE_URL=http://localhost:8080" > .env

# 3. Make sure backend is running
# http://localhost:8080 should be accessible

# 4. Start the app
npm start

# 5. Choose your platform
# Press 'i' for iOS, 'a' for Android, or 'w' for Web
```

## Project Structure at a Glance

```
src/
 ├─ api/              (HTTP client)
 ├─ components/       (Reusable UI)
 ├─ navigation/       (Screen navigation)
 ├─ screens/          (App pages)
 ├─ store/            (Auth state)
 └─ theme/            (Colors & styles)
```

## Key Files Reference

| File | Purpose | Key Function |
|------|---------|--------------|
| `src/api/axiosClient.ts` | HTTP client | Handles 401 + token refresh |
| `src/store/AuthContext.tsx` | Auth state | login(), signup(), logout() |
| `src/theme/ThemeContext.tsx` | Theme provider | Light/Dark mode switching |
| `src/components/Button.tsx` | Button component | Pill-shaped iOS button |
| `src/components/Input.tsx` | Text input | With error handling |
| `App.tsx` | Entry point | Renders entire app |

## Common Tasks

### Adding a New Screen

1. Create file: `src/screens/MyFeature/MyScreen.tsx`
2. Add to navigation stack (in `src/navigation/`)
3. Use:
   ```typescript
   import { useTheme } from '../../theme/ThemeContext';
   import { useAuth } from '../../store/AuthContext';
   
   const MyScreen = () => {
     const { theme } = useTheme();
     const { isLoggedIn } = useAuth();
     // Your screen code
   };
   ```

### Making an API Call

1. Add method to `src/api/authApi.ts`
2. Use in your screen:
   ```typescript
   import { authApi } from '../../api/authApi';
   
   try {
     const response = await authApi.login(email, password);
   } catch (error) {
     Alert.alert('Error', error.response?.data?.message);
   }
   ```

### Styling a Component

```typescript
const { theme } = useTheme();

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.background,
    color: theme.text,
  },
});
```

## Debugging Tips

| Issue | Solution |
|-------|----------|
| Module not found | `npm install` + `npm start -- --clear` |
| Colors not changing | Restart app (press `r` in terminal) |
| Tokens not saving | Check `expo-secure-store` is installed |
| Backend error | Check backend is running on port 8080 |
| CORS errors | Check backend CORS config for port 19000-19001 |

## Navigation State Machine

```
Onboarding? 
 ├─ NO  → Dashboard ← AuthStack (Login/Signup)
 └─ YES → Login/Signup (if not authenticated)
```

## API Endpoints Required

```
POST /api/auth/signup   { fname, lname, email, password }
POST /api/auth/login    { email, password }
POST /api/auth/refresh  { refreshToken }
```

All return: `{ accessToken, refreshToken, message }`

## Environment Setup

Create `.env`:
```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
```

For Android emulator, use: `http://10.0.2.2:8080`

## Code Style

- **Functional components** with React Hooks
- **TypeScript** for type safety
- **StyleSheet** for all styles (not inline)
- **useTheme()** for colors (no hardcoded colors)
- **Error handling** with try-catch
- **Form validation** before submission

## Useful Commands

```bash
npm start              # Start dev server
npm run ios           # Open in iOS simulator
npm run android       # Open in Android emulator
npm run web           # Open in web browser
npm install <package> # Add dependency
npm test              # Run tests (if configured)
npm run build         # Build for production
```

## File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `Button.tsx`)
- Screens: `PascalCase.tsx` (e.g., `LoginScreen.tsx`)
- API files: `camelCase.ts` (e.g., `axiosClient.ts`)
- Context: `PascalCase.tsx` (e.g., `AuthContext.tsx`)
- Types: Include in file or `types.ts`

## Color Reference

### Light Mode
- Background: `#FFFFFF`
- Text: `#000000`
- Button: `#000000`
- Input: `#F5F5F5`

### Dark Mode
- Background: `#000000`
- Text: `#FFFFFF`
- Button: `#FFFFFF`
- Input: `#1C1C1C`

## Important: Token Handling

1. **SecureStore** (not AsyncStorage) stores tokens
2. **Axios interceptor** adds tokens to requests
3. **401 responses** trigger automatic token refresh
4. **Refresh endpoint** must return new accessToken
5. **Logout** clears both tokens

## Dev Tools

- **Terminal**: `expo start` → press `d` to open debugger
- **React DevTools**: Chrome extension for React inspection
- **Flipper**: Desktop app for mobile debugging

## Performance Tips

- Use `FlatList` for long lists (not `ScrollView`)
- Memoize components: `React.memo(Component)`
- Lazy load screens with `React.lazy()`
- Use `useCallback` for event handlers
- Avoid inline functions in renders

## Testing Locally

1. Sign up with test email: `test@example.com`
2. Password: `password123`
3. Check SecureStore saves tokens (in debug tools)
4. Make any API call to verify token is attached
5. Manually trigger 401 from backend to test refresh

## Production Checklist

- [ ] Change `http://localhost:8080` to production API URL
- [ ] Enable HTTPS
- [ ] Update `app.json` with correct bundle IDs
- [ ] Upload app icon and splash
- [ ] Configure analytics
- [ ] Enable error tracking (Sentry, etc.)
- [ ] Test on real devices
- [ ] Review security settings

## Resources

- [Expo Docs](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native API](https://reactnative.dev/docs/components-and-apis)
- [Axios Docs](https://axios-http.com/)
- [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)

## Getting Help

1. Check **INSTALLATION_GUIDE.md** for setup issues
2. Check **API_INTEGRATION_GUIDE.md** for backend issues
3. Check **README.md** for feature documentation
4. Review code comments in relevant files
5. Check terminal logs with `npm start`

---

**Happy coding! 🚀**
