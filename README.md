# Big Time Buyer Pic Portal

A mobile application for Big Time Advertising's clients to capture customer photos and videos with branded overlays, add customizable text, and generate AI-powered captions for social media submissions.

## Features

- **Photo & Video Capture**: Capture high-quality photos and videos directly in the app
- **Branded Overlays**: Apply transparent PNG overlays to photos and videos (1:1 ratio)
- **Text Overlays**: Add customizable text with drag-to-position, color picker, and font styles
- **AI-Powered Captions**: Generate social media captions using OpenAI Vision API
- **Gallery**: Track submission history with visual preview
- **Secure Authentication**: Email/password login with biometric support (Face ID/Touch ID)

## Tech Stack

### Frontend
- React Native with Expo SDK 54
- React Navigation v7
- TanStack React Query
- React Native Reanimated

### Backend
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- FFmpeg for video processing

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (see Environment Variables section)

3. Run the development server:
   ```bash
   npm run all:dev
   ```

4. Scan the QR code with Expo Go to test on your device

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `EXPO_PUBLIC_DOMAIN`: API server domain
- `SESSION_SECRET`: JWT session secret
- `RESEND_API_KEY`: Email service API key (optional)

## Distribution

This app is distributed to clients via Expo Go. Users can scan the QR code to access the app on their mobile devices.
