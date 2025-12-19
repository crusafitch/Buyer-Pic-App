# Photo Portal - Replit.md

## Overview

Photo Portal is a B2B mobile application built with React Native (Expo) that allows advertising agency clients to submit photos with branded overlays. The app features a camera interface for capturing photos, overlay selection, preview/caption functionality, and a gallery to track submission history. It follows a client-server architecture with an Express.js backend.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54 (New Architecture enabled)
- **Navigation**: React Navigation v7 with a hybrid structure:
  - Root stack navigator for modal flows (OverlaySelect, Preview, Success)
  - Bottom tab navigator for main app screens (Gallery, Create, Profile)
- **State Management**: 
  - TanStack React Query for server state
  - Local state with React hooks and AsyncStorage for offline submission storage
- **Styling**: StyleSheet-based with a centralized theme system (`client/constants/theme.ts`)
  - Light/dark mode support via `useColorScheme` hook
  - Consistent spacing, typography, and border radius tokens
- **Animations**: React Native Reanimated for smooth micro-interactions

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Server Entry**: `server/index.ts` handles CORS, body parsing, and static file serving
- **API Pattern**: Routes registered in `server/routes.ts`, prefixed with `/api`
- **Storage Layer**: Abstracted via `IStorage` interface in `server/storage.ts`
  - Currently uses in-memory storage (`MemStorage`)
  - Designed for easy swap to database implementation

### Data Storage
- **Database Schema**: Drizzle ORM with PostgreSQL dialect (`shared/schema.ts`)
- **Schema Validation**: Zod via `drizzle-zod` for type-safe insert schemas
- **Migrations**: Managed via `drizzle-kit` with output to `./migrations`
- **Local Storage**: AsyncStorage for client-side submission persistence

### Project Structure
```
client/          # React Native app code
  components/    # Reusable UI components
  screens/       # Screen components
  navigation/    # Navigation configuration
  hooks/         # Custom React hooks
  lib/           # API client and utilities
  constants/     # Theme and design tokens
server/          # Express backend
shared/          # Shared types and schemas (Drizzle)
assets/          # Images, icons, overlays
```

### Path Aliases
- `@/` → `./client`
- `@shared/` → `./shared`
- `@assets/` → `./assets`

## External Dependencies

### Third-Party Services & APIs
- **Authentication** (Planned): Apple Sign-In, Google Sign-In for client identification
- **Camera/Media**: `expo-camera` for photo capture, `expo-image-picker` for gallery access
- **Image Processing**: `react-native-view-shot` for capturing composited photo+overlay

### Database
- **PostgreSQL**: Primary database (configured via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM for type-safe database operations

### Key npm Packages
- **UI**: `expo-blur`, `expo-glass-effect`, `expo-haptics`, `expo-image`
- **Navigation**: `@react-navigation/native`, `@react-navigation/bottom-tabs`, `@react-navigation/native-stack`
- **Animation**: `react-native-reanimated`, `react-native-gesture-handler`
- **Networking**: TanStack React Query, native fetch with custom `apiRequest` wrapper

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain for client requests
- `REPLIT_DEV_DOMAIN`: Development domain for CORS configuration