# ExpenseTracker

<a alt="Nx logo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

✨ A modern Ionic/Angular expense tracker with real SMS auto-detection and local data storage.

## 🎯 Key Features

- 💰 **Track Expenses**: Manually log expenses with categories and payment methods
- 📱 **SMS Auto-Detection**: Automatically extract bank transactions from SMS (Android)
- 💾 **Local Storage**: All data stored locally on your device (IndexedDB)
- 📊 **Analytics**: View spending by category, monthly trends, and budget status
- 🎨 **Dark Mode**: Beautiful dark theme support
- 📈 **Budget Tracking**: Set monthly budget and track spending
- 💾 **Data Export**: Backup all expenses to JSON file

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm/yarn
- Android Studio (for mobile deployment)
- Android SDK with API 21+

### Development

For detailed setup instructions including SMS reading on Android, see [SETUP_GUIDE.md](./SETUP_GUIDE.md).

**Quick dev server:**

```sh
npm install
npx nx serve expense-tracker
```

**Build for production:**

```sh
npx nx build expense-tracker
```

## 📱 Real World Usage

This app is designed for real mobile usage with actual SMS reading from Indian banks.

### What Works

- ✅ **SMS Reading**: Real bank SMS detection on Android
- ✅ **Local Storage**: Persistent IndexedDB storage
- ✅ **SMS Parser**: Recognizes 50+ Indian banks and payment providers
- ✅ **Offline**: Works completely offline (except SMS reading)
- ✅ **Category Matching**: Smart merchant detection

### What Doesn't Work

- ❌ **SMS in Browser**: Browser-based SMS reading not supported (native only)
- ❌ **Cloud Sync**: No cloud storage (by design - all local)
- ❌ **API Calls**: No external API dependencies

## 🛠️ SMS Integration

The app requires a Capacitor SMS reader plugin:

```sh
npm install @capacitor-community/sms-reader
npx cap sync
```

Then add SMS permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for complete instructions.

## 📦 Project Structure

[Learn more about this workspace setup and its capabilities](https://nx.dev/getting-started/tutorials/angular-standalone-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or run `npx nx graph` to visually explore what was created.

## 🔧 Run tasks

To run the dev server for your app, use:

```sh
npx nx serve expense-tracker
```

To create a production bundle:

```sh
npx nx build expense-tracker
```

To see all available targets to run for a project, run:

```sh
npx nx show project expense-tracker
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## ➕ Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/angular:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/angular:lib mylib
```

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup and deployment guide
- [Nx Documentation](https://nx.dev)
- [Angular Documentation](https://angular.io)
- [Ionic Framework](https://ionicframework.com)
- [Capacitor](https://capacitorjs.com)

## 📄 License

MIT

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Set up CI!

### Step 1

To connect to Nx Cloud, run the following command:

```sh
npx nx connect
```

Connecting to Nx Cloud ensures a [fast and scalable CI](https://nx.dev/ci/intro/why-nx-cloud?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) pipeline. It includes features such as:

- [Remote caching](https://nx.dev/ci/features/remote-cache?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task distribution across multiple machines](https://nx.dev/ci/features/distribute-task-execution?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Automated e2e test splitting](https://nx.dev/ci/features/split-e2e-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Task flakiness detection and rerunning](https://nx.dev/ci/features/flaky-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

### Step 2

Use the following command to configure a CI workflow for your workspace:

```sh
npx nx g ci-workflow
```

[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/getting-started/tutorials/angular-standalone-tutorial?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:

- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
