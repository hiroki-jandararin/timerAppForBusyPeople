const IS_PROD = process.env.APP_ENV === 'production';

export default {
  expo: {
    name: IS_PROD ? "QuickFit" : "QuickFit (Dev)",
    slug: "quickfit-timer",
    scheme: "quickfit",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    ios: {
      bundleIdentifier: IS_PROD
        ? "com.tacos.quickfittimer"
        : "com.tacos.quickfittimer.dev",
      buildNumber: "1.0.1",
      icon: "./assets/icon.png",
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["audio"],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-router", "expo-secure-store"],
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      router: {},
      eas: {
        projectId: "d663eec8-0200-4828-876c-abbb4e17690b",
      },
    },
  },
};
