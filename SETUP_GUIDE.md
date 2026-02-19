# Expense Tracker - Real Setup Guide

This document explains how to set up the Expense Tracker app with real SMS reading and local data storage on mobile/Android devices.

## Overview of Changes

### ✅ Completed Improvements

1. **Removed all dummy/demo data** - No more fake SMS messages
2. **Enhanced local storage** - Uses IndexedDB with optional Capacitor Storage backup
3. **Improved SMS parser** - Better patterns for real Indian bank SMS
4. **Real SMS integration** - Now requires actual SMS reader plugin

### 📱 Real Features Implemented

- **Local Storage**: All expenses stored locally on device using IndexedDB
- **SMS Auto-detection**: Real SMS reading from device inbox
- **Payment Tracking**: Multiple payment methods (UPI, Card, Cash)
- **Category Management**: Customizable expense categories
- **Monthly Budget**: Track spending against budget limits
- **Data Export**: Backup all data to JSON file
- **Dark Mode**: Theme support

---

## Setup Instructions

### 1. Install Dependencies

```bash
cd expense-tracker1
npm install
```

### 2. Install Capacitor SMS Reader Plugin

The app requires a SMS reader plugin to read bank SMS on Android devices.

```bash
npm install capacitor-sms-reader
npx cap sync
```

**Note**: If `capacitor-sms-reader` is not found, use the community maintained version:

```bash
npm install @capacitor-community/sms-reader
npx cap sync
```

### 3. Android Configuration

Add the required SMS reading permission to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest ... >
    <!-- Add these permissions -->
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />

    <application ... >
        <!-- Your app config here -->
    </application>
</manifest>
```

### 4. Build and Deploy

#### Development on Device

```bash
# Build the web app for Android
npx nx build expense-tracker

# Sync to Android project
npx cap sync

# Open Android Studio IDE
npx cap open android
```

In Android Studio:

1. Connect your Android device (with USB debugging enabled)
2. Click "Run" to build and install on device
3. Grant SMS permissions when prompted
4. Launch the app

#### Web Browser (Testing)

```bash
# Start dev server
npx nx serve expense-tracker
```

Visit `http://localhost:4200` in your browser.

**Note**: SMS reading will fail in web browser (not supported). The error will prompt you to use a native device.

---

## How to Use

### 1. First Launch

- App initializes with default expense categories
- All data stored locally on device

### 2. Add Expenses Manually

1. Tap **"Add +"** button
2. Enter amount (₹)
3. Select category (Food, Travel, Entertainment, etc.)
4. Choose payment method (UPI, Card, Cash)
5. Tap **Save**

### 3. Auto-detect from SMS

1. Go to **Settings** (⚙️)
2. Enable **"SMS Auto-Read"** toggle
3. Tap **"Scan SMS Now"** button
4. App reads recent SMS from phone inbox
5. Bank transactions are extracted automatically
6. Expenses appear on dashboard

### 4. View Reports

- **Dashboard**: Monthly spending summary
- **Categories**: Breakdown by expense type
- **Reports**: Detailed transaction history
- **7-Day Trend**: Visual spending pattern

### 5. Manage Budget

1. Go to **Settings** (⚙️)
2. Set **"Monthly Budget"** amount
3. App warns when you exceed budget
4. See budget usage percentage

### 6. Backup Data

1. Go to **Settings** (⚙️)
2. Tap **"Export Data"** button
3. Download `expenses-backup.json`
4. Keep it safe for recovery

---

## Data Storage Details

### IndexedDB (Web/Capacitor)

- **Database**: `expense-tracker-db`
- **Version**: 1
- **Stores**:
  - `expenses`: All transactions with indexes by date and category
  - `categories`: Expense categories
  - `settings`: App settings (budget, theme, SMS enabled)

### Capacitor Storage (Mobile Fallback)

- Automatic backup of expenses to Capacitor Storage
- Used if main database fails
- Keys format: `expense_{id}`

### Data Persistence

- ✅ Data persists across app restarts
- ✅ Data persists when device is offline
- ✅ Data is completely local (no cloud sync)
- ⚠️ **Backup regularly** via export feature

---

## SMS Parser Specifications

The SMS parser now recognizes:

### Supported Banks

- HDFC, ICICI, Axis, SBI, Kotak, Yes Bank, IndusInd, IDBI, RBL

### Supported Payment Methods

- **Digital Wallets**: Google Pay, PhonePe, Paytm, WhatsApp Pay, BHIM
- **Cards**: Credit Card, Debit Card, Visa, Mastercard, RuPay
- **Bank Transfers**: NEFT, RTGS, IMPS
- **Direct**: ATM, Cash Withdrawal

### Supported Merchants

- **E-commerce**: Amazon, Flipkart, Myntra
- **Food**: Swiggy, Zomato, Uber Eats
- **Travel**: MakeMyTrip, OYO, Goibibo
- **Subscriptions**: Netflix, Prime, YouTube, Google, Microsoft
- **Generic**: Any merchant mentioned in SMS

### Amount Recognition

- Format: `Rs. 500`, `₹1,200.50`, `INR 100`, etc.
- Range: ₹1 to ₹10,000,000
- Decimals: Supported (e.g., ₹99.99)

### Transaction Type Detection

- **Debit**: Purchase, Payment, Transfer Out, Withdrawal, etc.
- **Credit**: Refund, Cashback, Salary, Deposit, etc.

---

## Troubleshooting

### "SMS Reader plugin not available"

**Solution**: Ensure the SMS reader plugin is installed:

```bash
npm install @capacitor-community/sms-reader
npx cap sync
npx cap open android
```

### "No SMS messages found"

**Possible causes**:

1. Device SMS permission not granted
   - Go to Settings > Apps > Expense Tracker > Permissions
   - Enable "SMS" permission

2. No recent bank SMS on device
   - Send yourself a test SMS from bank
   - Wait a moment before scanning

3. SMS format not recognized
   - Check that SMS is from your bank
   - Parser only recognizes Indian bank transactions

### Data not persisting

**Solution**: Check browser/device storage settings:

1. Web: Ensure cookies and site data are not blocked
2. Android: Check app storage permissions in system settings
3. Try exporting and re-importing data

### Dark mode not applying

**Solution**:

1. Go to **Settings** (⚙️)
2. Toggle **"Dark Theme"**
3. Refresh app (Force close and reopen)

### App crashes on SMS scan

**Solution**:

1. Build and deploy fresh from Android Studio
2. Grant all permissions when prompted
3. Check Android logcat for errors:
   ```bash
   npx cap open android
   # Then View > Tool Windows > Logcat
   ```

---

## Development Notes

### Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/          # Data models
│   │   ├── services/        # Business logic
│   │   └── utils/           # Helper functions (sms-parser)
│   ├── features/            # Feature components
│   ├── layout/              # Layout components
│   └── shared/              # Shared components
├── theme/                   # Styling
└── index.html               # Entry point
```

### Key Files Modified

- `src/app/core/services/sms.service.ts` - Real SMS implementation
- `src/app/core/services/storage.service.ts` - IndexedDB + Capacitor Storage
- `src/app/core/utils/sms-parser.util.ts` - Enhanced SMS parsing
- `capacitor.config.ts` - Capacitor configuration

### Adding New SMS Patterns

Edit `src/app/core/utils/sms-parser.util.ts`:

```typescript
// Add to AMOUNT_PATTERNS for new amount formats
const AMOUNT_PATTERNS = [
  // Your new regex pattern here
  /your-pattern-here/gi,
];

// Add to MERCHANT_PATTERNS for merchant extraction
const MERCHANT_PATTERNS = [{ pattern: /your-pattern/i, extract: (m) => m[1] }];
```

### Testing SMS Parser

```typescript
import { parseSMS } from './sms-parser.util';

const testSMS = 'Your A/C XX1234 debited Rs.500 to Amazon';
const parsed = parseSMS(testSMS);
console.log(parsed);
// Output: { amount: 500, type: 'debit', description: 'Amazon', ... }
```

---

## Performance Optimization

### IndexedDB Performance

- Indexes on `date` and `category` for fast filtering
- Paging recommended for large datasets (1000+ entries)
- Regular cleanup of old expenses recommended

### Storage Limits

- **Web**: ~50MB per app (browser dependent)
- **Android**: Device storage limits apply
- **Backup**: Manual export recommended

---

## Security & Privacy

- ✅ All data stored locally - NO cloud upload
- ✅ No internet required for SMS reading
- ✅ No API calls to external services
- ✅ SMS data only retained while app is open
- ✅ Regular backups recommended for recovery

---

## Capacitor Configuration

Key settings in `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.example.expensetrackerapp',
  appName: 'Expense Tracker',
  webDir: 'dist/src',
  // Add plugins configuration here
  plugins: {
    SmsReader: {
      // Plugin specific config
    },
  },
};
```

---

## Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Install SMS plugin: `npm install @capacitor-community/sms-reader`
3. ✅ Update AndroidManifest.xml with permissions
4. ✅ Build: `npx nx build expense-tracker`
5. ✅ Sync: `npx cap sync`
6. ✅ Open IDE: `npx cap open android`
7. ✅ Deploy to device and test

---

## Support & Issues

For issues:

1. Check troubleshooting section above
2. Enable verbose logging:
   ```typescript
   // In services
   console.error('Error:', error);
   ```
3. Check Android logcat for native errors
4. Review SMS original body in parsed data

---

**Last Updated**: February 19, 2026
**Version**: 1.0.0
