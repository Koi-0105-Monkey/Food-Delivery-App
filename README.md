<h3 align="center">Food Delivery Mobile App</h3>
## 📋 <a name="table">Table of Contents</a>

1. 🤖 [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)
5. 🔗 [Assets](#links)
6. 🚀 [More](#more)

## <a name="introduction">🤖 Introduction</a>

Built with React Native, TypeScript, and Tailwind CSS, this full-stack Food Delivery app features Google Authentication, dynamic search and filters, cart functionality, and smooth navigation. Powered by Appwrite for backend, database, and file storage, it delivers a responsive, scalable, and intuitive user experience with modern UI/UX best practices.

## <a name="tech-stack">⚙️ Tech Stack</a>

- **[Appwrite](https://jsm.dev/rn25-appwrite)** is an open-source backend-as-a-service platform offering secure authentication (email/password, OAuth, SMS, magic links), databases, file storage with compression/encryption, real-time messaging, serverless functions, and static site hosting via Appwrite Sites—all managed through a unified console and microservices architecture.

- **[Expo](https://expo.dev/)** is an open-source platform for building universal native apps (Android, iOS, web) using JavaScript/TypeScript and React Native. It features file-based routing via Expo Router, fast refresh, native modules for camera/maps/notifications, over-the-air updates (EAS), and streamlined app deployment.

- **[NativeWind](https://www.nativewind.dev/)** brings Tailwind CSS to React Native and Expo, allowing you to style mobile components using utility-first classes for fast, consistent, and responsive UI design.

- **[React Native](https://reactnative.dev/)** is a framework for building mobile UIs with React. It enables component‑based, cross-platform development with declarative UI, deep native API support, and is tightly integrated with Expo for navigation and native capabilities.

- **[Tailwind CSS](https://tailwindcss.com/)** is a utility-first CSS framework enabling rapid UI design via low-level classes. In React Native/Expo, it’s commonly used with NativeWind to apply Tailwind-style utilities to mobile components.

- **[TypeScript](https://www.typescriptlang.org/)** is a statically-typed superset of JavaScript providing type annotations, interfaces, enums, generics, and enhanced tooling. It improves error detection, code quality, and scalability—ideal for robust, maintainable projects.

- **[Zustand](https://github.com/pmndrs/zustand)** is a minimal, hook-based state management library for React and React Native. It lets you manage global state with zero boilerplate, no context providers, and excellent performance through selective state subscriptions.

- **[Sentry](https://jsm.dev/rn-food-sentry)** is a powerful error tracking and performance monitoring tool for React Native apps. It helps you detect, diagnose, and fix issues in real-time to improve app stability and user experience.



## <a name="features">🔋 Features</a>

### Features of the Mobile Movie AppProject

👉 **Google Authentication**: Secure and seamless user sign-ins using Google.  

👉 **Home Page**: Showcases the latest offers and directs users to filtered search results.  

👉 **Search Page**: Lets users explore all foods with category filters and keyword search.  

👉 **Product Details Page**: Displays food images, key details, and allows adding items to the cart.  

👉 **Cart Page**: Review selected items and see the total price.  

👉 **Profile Page**: Manage user settings and preferences.  

👉 **Appwrite Integration**: Handles backend database and file storage for food items.

and many more, including code architecture and reusability.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Cloning the Repository**

```bash
git clone https://github.com/Koi-0105-Monkey/Food-Delivery-App.git
cd Food-Delivery-App
```

**Installation**

Install the project dependencies using npm:

```bash
npm install
npx expo install expo-image-picker
npx expo install react-native-webview
npx expo install expo-haptics
npm install crypto-js
npm install --save-dev @types/crypto-js
npm install express
npm install qrcode
npm install vietqr
npm install express node-appwrite

```

**Set Up Environment Variables**

Create a new file named `.env` in the root of your project and add the following content:

```env
# ========== APPWRITE CONFIGURATION ==========
# Appwrite Project Settings
EXPO_PUBLIC_APPWRITE_PROJECT_ID=
EXPO_PUBLIC_APPWRITE_ENDPOINT=
EXPO_PUBLIC_APPWRITE_PLATFORM=
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=

# Appwrite Database IDs
EXPO_PUBLIC_APPWRITE_DATABASE_ID=
EXPO_PUBLIC_APPWRITE_BUCKET_ID=

# Appwrite Collection IDs
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_CATEGORIES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_MENU_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_CUSTOMIZATIONS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_MENU_CUSTOMIZATIONS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_USER_ADDRESSES_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_CART_ITEMS_COLLECTION_ID=
EXPO_PUBLIC_APPWRITE_ORDERS_COLLECTION_ID=

# ========== APPWRITE SERVER-SIDE (for seed.js) ==========
APPWRITE_API_KEY=
APPWRITE_SERVER_ENDPOINT=

DEBUG_MODE=false
PORT=3000
NODE_ENV=development
```

**Running the Project**
node backend/server.js
npx ngrok http 3000

```bash
npx expo start
```
or
```bash
npm start
```


Sign up for an ngrok account (free) Go to: 👉 https://dashboard.ngrok.com/signup Sign up with email or GitHub/Google. Remember to confirm email — if not verified, authtoken will not work → same error you encountered.
Get authtoken After logging in → go to page: 👉 https://dashboard.ngrok.com/get-started/your-authtoken You will see a line like: ngrok config add-authtoken <YOUR_TOKEN>
Paste token into the machine On terminal: ngrok config add-authtoken or if you haven't installed ngrok: npm install -g ngrok ngrok config add-authtoken
Run ngrok http 3000 again

Link figma:
https://www.figma.com/design/FIe3i6vwpWeUOvVwno7ua3/Food-Delivery-App?node-id=0-1&p=f

Nhánh detail 
chạy 2 file scripts:
node scripts/upload-customization-images.js
node scripts/update-customization-images.js