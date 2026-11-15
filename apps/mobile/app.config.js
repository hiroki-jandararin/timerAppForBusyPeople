const IS_PROD = process.env.APP_ENV === 'production';

// AdMob の iOS アプリ ID は秘匿情報ではないため定数で持つ。
// 環境変数に依存すると、APP_ENV=production だけで設定を評価する eas submit ステップが失敗しうる。
// 開発・プレビューは誤クリックによるアカウント停止を避けるため、Google のサンプル ID を使う
const PROD_ADMOB_IOS_APP_ID = "ca-app-pub-7353950256635107~1327738460";
const SAMPLE_ADMOB_IOS_APP_ID = "ca-app-pub-3940256099942544~1458002511";

// Google 公開の SKAdNetwork 識別子（https://developers.google.com/admob/ios/ios14）
const SK_AD_NETWORK_ITEMS = [
  "cstr6suwn9.skadnetwork",
  "4fzdc2evr5.skadnetwork",
  "2fnua5tdw4.skadnetwork",
  "ydx93a7ass.skadnetwork",
  "p78axxw29g.skadnetwork",
  "v72qych5uu.skadnetwork",
  "ludvb6z3bs.skadnetwork",
  "cp8zw746q7.skadnetwork",
  "3sh42y64q3.skadnetwork",
  "c6k4g5qg8m.skadnetwork",
  "s39g8k73mm.skadnetwork",
  "wg4vff78zm.skadnetwork",
  "3qy4746246.skadnetwork",
  "f38h382jlk.skadnetwork",
  "hs6bdukanm.skadnetwork",
  "mlmmfzh3r3.skadnetwork",
  "v4nxqhlyqp.skadnetwork",
  "wzmmz9fp6w.skadnetwork",
  "su67r6k2v3.skadnetwork",
  "yclnxrl5pm.skadnetwork",
  "t38b2kh725.skadnetwork",
  "7ug5zh24hu.skadnetwork",
  "gta9lk7p23.skadnetwork",
  "vutu7akeur.skadnetwork",
  "y5ghdn5j9k.skadnetwork",
  "v9wttpbfk9.skadnetwork",
  "n38lu8286q.skadnetwork",
  "47vhws6wlr.skadnetwork",
  "kbd757ywx3.skadnetwork",
  "9t245vhmpl.skadnetwork",
  "a2p9lx4jpn.skadnetwork",
  "22mmun2rn5.skadnetwork",
  "44jx6755aq.skadnetwork",
  "k674qkevps.skadnetwork",
  "4468km3ulz.skadnetwork",
  "2u9pt9hc89.skadnetwork",
  "8s468mfl3y.skadnetwork",
  "klf5c3l5u5.skadnetwork",
  "ppxm28t8ap.skadnetwork",
  "kbmxgpxpgc.skadnetwork",
  "uw77j35x4d.skadnetwork",
  "578prtvx9j.skadnetwork",
  "4dzt52r2t5.skadnetwork",
  "tl55sbb4fm.skadnetwork",
  "c3frkrj4fj.skadnetwork",
  "e5fvkxwrpn.skadnetwork",
  "8c4e2ghe7u.skadnetwork",
  "3rd42ekr43.skadnetwork",
  "97r2b46745.skadnetwork",
  "3qcr597p9d.skadnetwork",
];

export default {
  expo: {
    name: IS_PROD ? "QuickFit" : "QuickFit (Dev)",
    slug: "quickfit-timer",
    scheme: IS_PROD ? "quickfit" : "quickfit-dev",
    version: "1.1.0",
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
    plugins: [
      "expo-router",
      "expo-secure-store",
      [
        "react-native-google-mobile-ads",
        {
          iosAppId: IS_PROD ? PROD_ADMOB_IOS_APP_ID : SAMPLE_ADMOB_IOS_APP_ID,
          userTrackingUsageDescription:
            "広告をお客様に合わせて最適化するために、端末の広告識別子を使用します。許可しなくてもアプリはご利用いただけます。",
          skAdNetworkItems: SK_AD_NETWORK_ITEMS,
        },
      ],
    ],
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
