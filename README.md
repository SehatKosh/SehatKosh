# SehatKosh (صحت کوش)

SehatKosh is an integrated healthcare management platform built as a high-performance monorepo using **Turborepo** and **pnpm**. It contains a doctor-facing web portal and a patient-facing mobile application sharing common types, configurations, and mock data.

---

## 📁 Repository Structure

```text
SehatKosh/
├── apps/
│   ├── doctor-web/       # Doctor Web Portal (Next.js 14, Tailwind CSS, Radix UI)
│   └── mobile/           # Patient Mobile App (React Native 0.86, Expo SDK 57, Expo Router, NativeWind)
├── packages/
│   ├── mock-data/        # Shared mock datasets for development and offline testing
│   ├── tailwind-config/  # Shared Tailwind CSS design tokens and theme settings
│   └── types/            # Shared TypeScript data models and API schemas
├── pnpm-workspace.yaml   # Workspace definitions
├── turbo.json            # Turborepo task pipeline configuration
└── package.json          # Root scripts and workspace dependencies
```

---

## 🛠️ Prerequisites

Before getting started, make sure you have the following installed on your machine:

1. **Node.js (LTS version 20.x or 22.x recommended)**:
   - Check version:
     ```bash
     node -v
     ```
   - Download: [nodejs.org](https://nodejs.org/)

2. **pnpm (v9.7.0 recommended)**:
   - Install globally via npm:
     ```bash
     npm install -g pnpm@9.7.0
     ```
   - Or enable via Corepack:
     ```bash
     corepack enable
     corepack prepare pnpm@9.7.0 --activate
     ```
   - Check version:
     ```bash
     pnpm -v
     ```

3. **Mobile Development Tools (for `apps/mobile`)**:
   - **Expo Go App**: Install **Expo Go (SDK 57)** on your physical iOS or Android device from the App Store / Google Play Store.
   - *(Optional)* **Android Studio** (for Android Emulator) or **Xcode** (for iOS Simulator on macOS).

---

## 🚀 Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/SehatKosh.git
cd SehatKosh
```

### 2. (Windows Only) Set PowerShell Execution Policy

If you are on Windows and see an error like `cannot be loaded because running scripts is disabled on this system`, run PowerShell and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 3. Install Dependencies

Install all dependencies across the entire monorepo with a single command from the root directory:

```bash
pnpm install
```

> **Note**: Do not use standard `npm install` directly in subfolders, as this project relies on `pnpm` workspaces for local package linking (`workspace:*`).

---

## 🖥️ Running the Applications

You can run each application individually or run both simultaneously.

### Option A: Run the Web UI (Doctor Portal)

From the project root:

```bash
pnpm run dev:web
```

Or navigate to the web directory:

```bash
cd apps/doctor-web
pnpm run dev
```

- **URL**: [http://localhost:3000](http://localhost:3000)
- **Default Route**: Automatically routes to `/doctor/queue`

---

### Option B: Run the Mobile App (Expo Go SDK 57)

From the project root:

```bash
pnpm run dev:mobile
```

Or navigate directly to the mobile directory:

```bash
cd apps/mobile
npx expo start
```

#### How to view the Mobile App:
1. **Physical Device (Expo Go)**:
   - Open the **Expo Go** app (must be SDK 57 compatible).
   - Scan the QR code displayed in your terminal (ensure your phone and computer are on the same Wi-Fi network).
   - If on separate networks or VPN, run `npx expo start --tunnel`.
2. **Android Emulator**:
   - Press <kbd>a</kbd> in the terminal running Expo.
3. **iOS Simulator** (macOS only):
   - Press <kbd>i</kbd> in the terminal running Expo.

---

### Option C: Run Both Simultaneously

To start both the Web portal and the Mobile development server concurrently:

```bash
pnpm run dev
```

Turborepo will spin up both servers in parallel:
- Doctor Web at `http://localhost:3000`
- Mobile Metro Bundler at `http://localhost:8081`

---

## 📜 Available Scripts

Run these scripts from the repository root:

| Command | Description |
| :--- | :--- |
| `pnpm run dev` | Runs both Web and Mobile apps concurrently via Turborepo |
| `pnpm run dev:web` | Starts only the Next.js Doctor Web application (`apps/doctor-web`) |
| `pnpm run dev:mobile` | Starts the Expo Metro Bundler for Mobile (`apps/mobile`) |
| `pnpm run build` | Builds all packages and applications |
| `pnpm run lint` | Runs linters across all workspace projects |
| `pnpm run clean` | Cleans build caches and removes `node_modules` |

---

## 🔧 Troubleshooting & Tips

### 1. Port 3000 or 8081 is already in use
If another application or zombie process is using the required ports:
- **Windows PowerShell**:
  ```powershell
  # Find process using port 3000 or 8081
  Get-NetTCPConnection -LocalPort 3000, 8081 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
  
  # Stop the process by PID
  Stop-Process -Id <PID> -Force
  ```
- **macOS / Linux**:
  ```bash
  lsof -ti:3000 | xargs kill -9
  lsof -ti:8081 | xargs kill -9
  ```

### 2. Clearing the Metro Bundler Cache
If changes to styles, NativeWind, or shared workspace packages aren't reflecting:
```bash
cd apps/mobile
npx expo start -c
```

### 3. Clearing Next.js Cache
```bash
cd apps/doctor-web
rm -rf .next
pnpm run dev
```

### 4. Expo Go SDK Version Mismatch
If your phone's Expo Go app warns about SDK version incompatibility, verify that your Expo Go version matches **SDK 57**. You can check the current SDK version in [apps/mobile/package.json](apps/mobile/package.json) (`expo: ~57.0.20`).
