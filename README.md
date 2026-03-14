# Plotify

<div align="center">
  <br />
  <h3 align="center">Real Estate Mobile App</h3>
  <p align="center">Built with Expo, React Native, and Supabase</p>
  <p align="center">Modern UI/UX with the Plotify theme</p>

  <div>
    <img src="https://img.shields.io/badge/-Expo-black?style=for-the-badge&logoColor=white&logo=expo&color=000020" alt="expo" />
    <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logoColor=white&logo=typescript&color=3178C6" alt="typescript" />
    <img src="https://img.shields.io/badge/-React_Native-black?style=for-the-badge&logoColor=white&logo=react&color=61DAFB" alt="react-native" />
    <img src="https://img.shields.io/badge/-NativeWind-black?style=for-the-badge&logoColor=white&logo=tailwindcss&color=06B6D4" alt="nativewind" />
    <img src="https://img.shields.io/badge/-Supabase-black?style=for-the-badge&logoColor=white&logo=supabase&color=3ECF8E" alt="supabase" />
  </div>
</div>

---

## Description

**Plotify** is a full-featured real estate mobile application built with **Expo**, **React Native**, and **Supabase**. It offers property listings, user-posted properties, admin management, announcements, notifications, reviews, community forums, and a property removal request workflow—all backed by a modern stack and a consistent Plotify-themed UI.

---

## Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Setup / Installation](#-setup--installation)
4. [Environment Variables](#-environment-variables)
5. [Dev Build & APK](#-dev-build--apk)
6. [Project Structure](#-project-structure)
7. [Credits](#-credits)
8. [License](#-license)

---

## Features

### Property & Listings
- **Property listing** – Browse properties with filtering (location, price, type, bedrooms, etc.)
- **Add property** – Users can post their own listings (user-generated content)
- **Property details** – View full details, gallery, and agent/owner info

### Admin
- **Admin panel** – Mobile and web-aligned data; admins manage properties, announcements, and removal requests from a dedicated admin flow

### Announcements & Notifications
- **Announcements** – Admin posts announcements; users see them on the home screen
- **Notifications** – Real notifications with the option to **delete** individual notifications (including hiding broadcast notifications per user)

### Workflows & Community
- **Property removal request** – Users can request removal of a listing; admins process requests in the admin panel
- **Reviews system** – Real Supabase `property_reviews` table; users can read and write reviews for properties
- **Community forums** – Real data from Supabase (no hardcoded content); create posts, comment, and like

### Other
- **Real-time News** – News API integration for real estate news (e.g. India-focused) with caching
- **Push notifications** – Via Expo Notifications (requires a **development build**, not Expo Go)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Expo SDK** | Development platform and tooling |
| **React Native** | Cross-platform mobile UI |
| **TypeScript** | Type-safe development |
| **Expo Router** | File-based routing |
| **NativeWind** | Tailwind-style styling (Tailwind for React Native) |

### Backend
| Technology | Purpose |
|------------|---------|
| **Supabase Database** | PostgreSQL – properties, users, reviews, forums, announcements, notifications, removal requests |
| **Supabase Storage** | Property images and assets |
| **Supabase Edge Functions** | (If used) Serverless functions |
| **Supabase Auth** | (If used) Authentication; app also supports custom auth via `public.users` |

### Other
| Technology | Purpose |
|------------|---------|
| **News API** | Real-time real estate news integration |
| **Expo Notifications** | Push notifications (Dev Build only) |

---

## Setup / Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- [Git](https://git-scm.com/)

### Clone & install
```bash
git clone https://github.com/your-username/plotify.git
cd plotify
npm install
# or
yarn install
```

### Environment variables
Create a `.env` (or `.env.local`) in the project root with the required variables. See [Environment Variables](#-environment-variables) for the template.

### Start development server
```bash
npx expo start
```

Then:
- Press **`a`** for Android emulator  
- Press **`i`** for iOS simulator  
- Or scan the QR code with **Expo Go** on your device  

> **Note:** Push notifications do **not** work in Expo Go. Use a [development build](#-dev-build--apk) for full notification support.

---

## Environment Variables

Copy the template below and fill in your values. Do not commit real keys.

```env
# Supabase (required)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# News API (optional – real estate news; app has fallback if missing)
EXPO_PUBLIC_NEWS_API_KEY=your_newsapi_key

# Google (optional – e.g. Maps or OAuth if you add it)
# EXPO_PUBLIC_GOOGLE_API_KEY=your_google_api_key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous (public) key |
| `EXPO_PUBLIC_NEWS_API_KEY` | No | [NewsAPI.org](https://newsapi.org/) key for real estate news |
| `EXPO_PUBLIC_GOOGLE_*` | No | Only if you use Google services (Maps, OAuth, etc.) |

---

## Dev Build & APK

### Why a dev build?
- **Push notifications** use native modules and only work in a **custom development build**, not in Expo Go.
- For full notification support (and other native features), create a dev build and run the app from that build.

### Create a development build (EAS)
1. Install EAS CLI: `npm install -g eas-cli`
2. Log in: `eas login`
3. Configure the project (if needed): `eas build:configure`
4. Build for Android (development client):
   ```bash
   eas build --profile development --platform android
   ```
5. Install the generated build on your device or emulator and run the app with `npx expo start`; the dev client will load your project.

### Generate an APK (EAS Build)
1. Ensure `eas.json` has a **preview** or **production** profile (e.g. `distribution: "internal"` for internal APK).
2. Run:
   ```bash
   eas build --profile preview --platform android
   # or
   eas build --profile production --platform android
   ```
3. EAS will build in the cloud; when finished, download the APK from the Expo dashboard or the link provided.

For **production** store releases, use the `production` profile and then use `eas submit` to send the build to the Play Store.

---

## Project Structure

```
plotify/
├── app/                    # Expo Router screens
│   ├── (admin)/            # Admin panel routes
│   ├── (root)/             # Main app (tabs: home, explore, profile)
│   │   └── (tabs)/
│   ├── properties/         # Property list & detail
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── _layout.tsx
├── components/             # Reusable UI (AddPropertyModal, CommunityForums, etc.)
├── constants/              # Theme (Plotify palette), icons, images
├── lib/                    # Services & utilities
│   ├── supabase.ts         # Supabase client
│   ├── supabase-auth.ts    # Auth (custom users)
│   ├── supabase-db.ts      # DB queries (properties, reviews, forums, etc.)
│   ├── supabase-storage.ts # Storage helpers
│   ├── announcements.ts    # Announcements CRUD
│   ├── notifications.ts    # Notifications & push
│   └── news.ts             # News API integration
├── assets/                 # Fonts, images, icons
├── app.json                # Expo config (name: Plotify)
├── eas.json                # EAS Build profiles
└── package.json
```

---

## Credits

- **Author:** Developed by [Soubhik Roy](https://www.linkedin.com/in/soubhik-roy07/)
- Built with [Expo](https://expo.dev/)
- Styled with [NativeWind](https://www.nativewind.dev/) / [Tailwind CSS](https://tailwindcss.com/)
- Backend by [Supabase](https://supabase.com/)
- Icons from [Expo Vector Icons](https://icons.expo.fyi/)

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>If you find this project helpful, please give it a ⭐️</p>
</div>
