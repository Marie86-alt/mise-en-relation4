module.exports = {
  expo: {
    name: "A La Case Nout Gramoun",
    slug: "mise-en-relation-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "miseenrelationapp",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.miseenrelation.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        LSApplicationQueriesSchemes: ["tel", "mailto"]
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.miseenrelation.app",
      versionCode: 2,
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          category: ["DEFAULT", "BROWSABLE"],
          data: { scheme: "tel" }
        },
        {
          action: "VIEW",
          category: ["DEFAULT", "BROWSABLE"],
          data: { scheme: "mailto" }
        }
      ]
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.miseenrelation.app",
          enableGooglePay: true,
          merchantCountryCode: "FR",
          androidPayMode: "test"
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      router: {},
      eas: {
        projectId: "9405dede-40c8-4c9d-a6e6-4fa8f7992c05"
      },
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.155:8001',
      EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      EXPO_PUBLIC_ENV: process.env.EXPO_PUBLIC_ENV || 'prod'
    }
  }
};
