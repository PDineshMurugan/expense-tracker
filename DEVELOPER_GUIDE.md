# Expense Tracker - Developer Guide

Welcome to the Expense Tracker application! This document provides a comprehensive overview of the codebase architecture, technology stack, and features to help new developers quickly onboard and understand how the application works.

## 🚀 Technology Stack

The application is built using a modern mobile-first web stack:
- **Framework**: [Angular](https://angular.io/) (v17+) using Standalone Components.
- **UI Toolkit**: [Ionic Framework](https://ionicframework.com/) for native-feeling mobile UI components.
- **Native Bridge**: [Capacitor](https://capacitorjs.com/) for accessing native device features (Storage, SMS, Notifications).
- **Styling**: SCSS with custom theming, dark mode (`src/theme/dark-mode.scss`), glassmorphism effects, and CSS variables.
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via `idb` library) for robust, offline-first local storage, with a fallback to Capacitor Preferences on mobile.

## 📂 Project Structure

The codebase follows a feature-based architectural pattern commonly used in scalable Angular applications.

```
src/
├── app/
│   ├── core/              # Singleton services, models, and core logic
│   │   ├── models/        # TypeScript interfaces defining data structures
│   │   └── services/      # Business logic and state management
│   ├── features/          # Feature modules/components (Dashboard, Expenses, Settings)
│   ├── shared/            # Reusable UI components (e.g., notification-toast)
│   └── app.component.ts   # Root component and navigation shell
├── theme/                 # Global styles, variables, and dark mode configs
├── index.html             # Main entry point
└── main.ts                # Application bootstrap
```

## 🧠 Core Architecture & State Management

The app relies heavily on **Angular Signals** (`@angular/core`) for reactive state management rather than complex libraries like NgRx. Services fetch from the local database and expose Signals for components to consume cleanly.

### Key Services (`src/app/core/services/`)
1. **`StorageService`**: The backbone of the app. Manages the IndexedDB instance (`expense-tracker-db`), handles DB upgrades, and provides a fallback to Capacitor Storage. All other services interact with the database through this service.
2. **`ExpenseService`**: Manages CRUD operations for transactions. Exposes computed signals like `monthlyTotal`, `todaySpend`, and `last7DaysTrend` for dashboards.
3. **`CategoryService`**: Manages expense categories. The app ships with `DEFAULT_CATEGORIES` (e.g., Food, Transport) initialized on the first run.
4. **`AccountService`**: Manages different financial accounts (Bank, Cash, Wallets).
5. **`SmsService` & `NotificationReaderService`**: These handle native Android integrations. They read incoming bank SMS messages and Android push notifications to automatically extract and parse financial transactions.
6. **`ThemeService`**: Manages light/dark mode toggling and system preference detection.

## ✨ Key Features

### 1. Offline-First Storage
The application has no backend server or cloud sync requirements. Data is perfectly secure on the user's device. 
- All data operations are awaited Promises to the local IndexedDB.
- `StorageService.exportAll()` and `importAll()` are available for manual user backups.

### 2. Auto-Detected Transactions (SMS & Notifications)
A standout feature of this app is its ability to automatically read Indian bank SMS patterns and Android Notifications to categorize spendings.
- **Custom Capacitor Plugins**: The app communicates with native Android code to intercept messages.
- **Regex Parsing**: The texts are matched against known formats to determine the Amount, Merchant, Date, and Account Number.

### 3. Modern "Premium" UI
- **Glassmorphism**: Extensively uses `backdrop-filter: blur(10px)` with semi-transparent backgrounds to give a modern, iOS-like depth to cards and headers.
- **Dynamic Animations**: Page transitions and element renders use smooth animations.
- **Theming**: Deep integration with standard CSS variables. Changing the primary color updates the entire UI dynamically.

## 🛠️ Data Handling & "Dummy" Data

> **Note for Production:** The application does **NOT** use any dummy or mock seeding for transactions. New installations begin with a blank ledger. 

The only pre-seeded data in the entire application resides in `src/app/core/models/category.model.ts` as `DEFAULT_CATEGORIES`. This provides users with a sensible set of categories (Food, Rent, Bills, etc.) right out of the box so they don't have to configure everything manually. This is intended production behavior and should not be removed.

## 🏃‍♂️ Getting Started for Developers

1. **Install Dependencies**: `npm install`
2. **Run Local Dev Server**: `npm run start` or `ionic serve`
3. **Build for Production**: `npm run build`
4. **Sync with Android**: `npx cap sync android`
5. **Open Android Studio**: `npx cap open android`

When testing the SMS/Notification features, you must run the app on a physical Android device or emulator with appropriate permissions granted.

---
_This guide was automatically generated based on the current architecture. Maintain it as new services and features are introduced._
