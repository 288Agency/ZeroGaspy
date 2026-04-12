# iOS Widget — Config Plugin + WidgetKit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un widget iOS natif (WidgetKit / SwiftUI) en 2 tailles (small + medium) affichant les aliments expirants et les économies du mois, via un Expo Config Plugin qui génère et injecte l'extension Xcode automatiquement au build EAS.

**Architecture:** Un Config Plugin TypeScript (`plugins/withIOSWidget.ts`) manipule le projet Xcode généré par Expo pour ajouter une widget extension target. Les données transitent via `UserDefaults` avec App Group (`group.com.zerogaspy.app`) — côté RN via `react-native-default-preference`, côté Swift via `UserDefaults(suiteName:)`. Le tap sur le widget envoie le deep link `zerogaspy://expiring-soon` → `ExpiringSoon` screen.

**Tech Stack:** Swift 5.9, SwiftUI, WidgetKit, `@expo/config-plugins`, `react-native-default-preference` (déjà installé), EAS Build, Xcode 15+

**Prérequis :** Mac avec Xcode 15+, Apple Developer account (Team ID: `M32LP7D76G`), App Group configuré dans Apple Developer Console.

---

## File Map

| Fichier | Action | Responsabilité |
|---|---|---|
| `targets/widget/WidgetDataEntry.swift` | Créer | Modèle de données + TimelineProvider Swift |
| `targets/widget/ZeroGaspyWidget.swift` | Créer | Vues SwiftUI small + medium |
| `targets/widget/ZeroGaspyWidgetBundle.swift` | Créer | Point d'entrée de l'extension |
| `targets/widget/Info.plist` | Créer | Configuration de l'extension |
| `targets/widget/ZeroGaspyWidget.entitlements` | Créer | App Group pour l'extension |
| `plugins/withIOSWidget.ts` | Créer | Config Plugin — injection Xcode |
| `widgets/widgetDataService.ts` | Modifier | Écriture UserDefaults App Group iOS |
| `app.config.ts` | Modifier | Ajouter plugin + App Group entitlement |
| `App.tsx` | Modifier | Ajouter handler deep link `expiring-soon` |

---

## Task 0 : Configurer App Group dans Apple Developer Console

> ⚠️ Étape manuelle requise avant tout build.

- [ ] **Step 1 : Créer l'App Group**

  Sur [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → App Groups → `+`

  - Identifier : `group.com.zerogaspy.app`
  - Description : `ZeroGaspy Shared Data`

- [ ] **Step 2 : Associer au main App ID**

  Identifiers → `com.zerogaspy.app` → App Groups → cocher `group.com.zerogaspy.app`

- [ ] **Step 3 : Créer l'App ID du widget**

  Identifiers → `+` → App IDs → App
  - Bundle ID : `com.zerogaspy.app.widget`
  - Capabilities : App Groups → cocher `group.com.zerogaspy.app`

---

## Task 1 : Fichiers Swift de l'extension

**Files:**
- Create: `targets/widget/WidgetDataEntry.swift`
- Create: `targets/widget/ZeroGaspyWidget.swift`
- Create: `targets/widget/ZeroGaspyWidgetBundle.swift`
- Create: `targets/widget/Info.plist`
- Create: `targets/widget/ZeroGaspyWidget.entitlements`

- [ ] **Step 1 : Créer `targets/widget/WidgetDataEntry.swift`**

  ```swift
  import WidgetKit
  import Foundation

  // MARK: - Data Models

  struct ExpiringFoodEntry: Codable {
      let name: String
      let daysLeft: Int
      let listName: String
  }

  struct WidgetPayload: Codable {
      let expiringFoods: [ExpiringFoodEntry]
      let monthlySavings: Double
      let lastUpdated: String
  }

  // MARK: - Timeline Entry

  struct ZeroGaspyEntry: TimelineEntry {
      let date: Date
      let expiringFoods: [ExpiringFoodEntry]
      let monthlySavings: Double
  }

  // MARK: - Data Loading

  func loadWidgetPayload() -> WidgetPayload? {
      guard let defaults = UserDefaults(suiteName: "group.com.zerogaspy.app"),
            let jsonString = defaults.string(forKey: "widgetData"),
            let jsonData = jsonString.data(using: .utf8) else {
          return nil
      }
      return try? JSONDecoder().decode(WidgetPayload.self, from: jsonData)
  }

  // MARK: - Timeline Provider

  struct ZeroGaspyProvider: TimelineProvider {

      func placeholder(in context: Context) -> ZeroGaspyEntry {
          ZeroGaspyEntry(
              date: Date(),
              expiringFoods: [
                  ExpiringFoodEntry(name: "Poulet", daysLeft: 0, listName: "Frigo"),
                  ExpiringFoodEntry(name: "Yaourt", daysLeft: 1, listName: "Frigo"),
              ],
              monthlySavings: 34
          )
      }

      func getSnapshot(in context: Context, completion: @escaping (ZeroGaspyEntry) -> Void) {
          let payload = loadWidgetPayload()
          let entry = ZeroGaspyEntry(
              date: Date(),
              expiringFoods: payload?.expiringFoods ?? [],
              monthlySavings: payload?.monthlySavings ?? 0
          )
          completion(entry)
      }

      func getTimeline(in context: Context, completion: @escaping (Timeline<ZeroGaspyEntry>) -> Void) {
          let payload = loadWidgetPayload()
          let entry = ZeroGaspyEntry(
              date: Date(),
              expiringFoods: payload?.expiringFoods ?? [],
              monthlySavings: payload?.monthlySavings ?? 0
          )
          // Rafraîchir toutes les 30 minutes
          let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
          let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
          completion(timeline)
      }
  }
  ```

- [ ] **Step 2 : Créer `targets/widget/ZeroGaspyWidget.swift`**

  ```swift
  import WidgetKit
  import SwiftUI

  // MARK: - Colors

  private let colorGreen = Color(red: 60/255, green: 110/255, blue: 71/255)
  private let colorCream = Color(red: 247/255, green: 245/255, blue: 230/255)
  private let colorRed = Color(red: 239/255, green: 68/255, blue: 68/255)
  private let colorOrange = Color(red: 249/255, green: 115/255, blue: 22/255)
  private let colorYellow = Color(red: 234/255, green: 179/255, blue: 8/255)

  // MARK: - Helpers

  private func expirationColor(daysLeft: Int) -> Color {
      if daysLeft < 0 { return colorRed }
      if daysLeft == 0 { return colorOrange }
      if daysLeft <= 2 { return colorYellow }
      return colorGreen
  }

  private func expirationLabel(daysLeft: Int) -> String {
      if daysLeft < 0 { return "Expiré" }
      if daysLeft == 0 { return "Auj." }
      if daysLeft == 1 { return "Demain" }
      return "\(daysLeft)j"
  }

  // MARK: - Small Widget (2×2)

  struct SmallWidgetView: View {
      let entry: ZeroGaspyEntry

      var urgentCount: Int {
          entry.expiringFoods.filter { $0.daysLeft <= 1 }.count
      }

      var body: some View {
          ZStack {
              colorCream
              VStack(alignment: .leading, spacing: 6) {
                  HStack {
                      Text("🥗")
                          .font(.system(size: 20))
                      Spacer()
                      if urgentCount > 0 {
                          Text("\(urgentCount)")
                              .font(.system(size: 12, weight: .bold))
                              .foregroundColor(.white)
                              .frame(width: 22, height: 22)
                              .background(colorRed)
                              .clipShape(Circle())
                      }
                  }
                  Text("ZeroGaspy")
                      .font(.system(size: 13, weight: .bold))
                      .foregroundColor(colorGreen)
                  Spacer()
                  if entry.monthlySavings > 0 {
                      Text("~\(Int(entry.monthlySavings)) € économisés")
                          .font(.system(size: 11, weight: .semibold))
                          .foregroundColor(colorGreen)
                  }
                  Text(entry.expiringFoods.isEmpty
                       ? "Tout va bien ✨"
                       : "\(entry.expiringFoods.count) à surveiller")
                      .font(.system(size: 10))
                      .foregroundColor(.secondary)
              }
              .padding(12)
          }
      }
  }

  // MARK: - Medium Widget (4×2)

  struct MediumWidgetView: View {
      let entry: ZeroGaspyEntry

      var body: some View {
          ZStack {
              colorCream
              VStack(alignment: .leading, spacing: 6) {
                  // Header
                  HStack {
                      Text("🥗 ZeroGaspy")
                          .font(.system(size: 13, weight: .bold))
                          .foregroundColor(colorGreen)
                      Spacer()
                      if entry.monthlySavings > 0 {
                          Text("~\(Int(entry.monthlySavings)) €")
                              .font(.system(size: 12, weight: .bold))
                              .foregroundColor(colorGreen)
                      }
                  }

                  Divider()

                  if entry.expiringFoods.isEmpty {
                      Spacer()
                      HStack {
                          Spacer()
                          VStack(spacing: 4) {
                              Text("✨")
                                  .font(.system(size: 24))
                              Text("Aucun aliment n'expire bientôt")
                                  .font(.system(size: 11))
                                  .foregroundColor(.secondary)
                                  .multilineTextAlignment(.center)
                          }
                          Spacer()
                      }
                      Spacer()
                  } else {
                      ForEach(Array(entry.expiringFoods.prefix(3).enumerated()), id: \.offset) { _, food in
                          FoodRowView(food: food)
                      }
                      if entry.expiringFoods.count > 3 {
                          Text("+ \(entry.expiringFoods.count - 3) autre\(entry.expiringFoods.count - 3 > 1 ? "s" : "")")
                              .font(.system(size: 10))
                              .foregroundColor(.secondary)
                              .italic()
                      }
                  }
                  Spacer(minLength: 0)
              }
              .padding(12)
          }
      }
  }

  struct FoodRowView: View {
      let food: ExpiringFoodEntry

      var body: some View {
          HStack(spacing: 8) {
              Circle()
                  .fill(expirationColor(daysLeft: food.daysLeft))
                  .frame(width: 8, height: 8)
              Text(food.name)
                  .font(.system(size: 12, weight: .semibold))
                  .foregroundColor(colorGreen)
                  .lineLimit(1)
              Spacer()
              Text(expirationLabel(daysLeft: food.daysLeft))
                  .font(.system(size: 10, weight: .bold))
                  .foregroundColor(expirationColor(daysLeft: food.daysLeft))
                  .padding(.horizontal, 6)
                  .padding(.vertical, 2)
                  .background(expirationColor(daysLeft: food.daysLeft).opacity(0.15))
                  .clipShape(Capsule())
          }
      }
  }

  // MARK: - Widget Definition

  struct ZeroGaspyWidget: Widget {
      let kind: String = "ZeroGaspyWidget"

      var body: some WidgetConfiguration {
          StaticConfiguration(kind: kind, provider: ZeroGaspyProvider()) { entry in
              ZeroGaspyWidgetEntryView(entry: entry)
                  .widgetURL(URL(string: "zerogaspy://expiring-soon"))
          }
          .configurationDisplayName("ZeroGaspy")
          .description("Voir les aliments qui expirent bientôt.")
          .supportedFamilies([.systemSmall, .systemMedium])
      }
  }

  struct ZeroGaspyWidgetEntryView: View {
      var entry: ZeroGaspyEntry
      @Environment(\.widgetFamily) var family

      var body: some View {
          switch family {
          case .systemSmall:
              SmallWidgetView(entry: entry)
          case .systemMedium:
              MediumWidgetView(entry: entry)
          default:
              SmallWidgetView(entry: entry)
          }
      }
  }
  ```

- [ ] **Step 3 : Créer `targets/widget/ZeroGaspyWidgetBundle.swift`**

  ```swift
  import WidgetKit
  import SwiftUI

  @main
  struct ZeroGaspyWidgetBundle: WidgetBundle {
      var body: some Widget {
          ZeroGaspyWidget()
      }
  }
  ```

- [ ] **Step 4 : Créer `targets/widget/Info.plist`**

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>ZeroGaspy</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleInfoDictionaryVersion</key>
    <string>6.0</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>$(MARKETING_VERSION)</string>
    <key>CFBundleVersion</key>
    <string>$(CURRENT_PROJECT_VERSION)</string>
    <key>NSExtension</key>
    <dict>
      <key>NSExtensionPointIdentifier</key>
      <string>com.apple.widgetkit-extension</string>
    </dict>
  </dict>
  </plist>
  ```

- [ ] **Step 5 : Créer `targets/widget/ZeroGaspyWidget.entitlements`**

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
  <dict>
    <key>com.apple.security.application-groups</key>
    <array>
      <string>group.com.zerogaspy.app</string>
    </array>
  </dict>
  </plist>
  ```

- [ ] **Step 6 : Commit**

  ```bash
  git add targets/widget/
  git commit -m "feat: fichiers Swift widget iOS (WidgetKit + SwiftUI)"
  ```

---

## Task 2 : Expo Config Plugin

**Files:**
- Create: `plugins/withIOSWidget.ts`

- [ ] **Step 1 : Créer le dossier `plugins/`**

  ```bash
  mkdir -p plugins
  ```

- [ ] **Step 2 : Créer `plugins/withIOSWidget.ts`**

  ```typescript
  import {
    ConfigPlugin,
    withXcodeProject,
    withEntitlementsPlist,
    createRunOncePlugin,
  } from '@expo/config-plugins';
  import * as fs from 'fs';
  import * as path from 'path';

  const APP_GROUP = 'group.com.zerogaspy.app';
  const WIDGET_TARGET_NAME = 'ZeroGaspyWidget';
  const WIDGET_BUNDLE_ID = 'com.zerogaspy.app.widget';
  const SWIFT_FILES = [
    'WidgetDataEntry.swift',
    'ZeroGaspyWidget.swift',
    'ZeroGaspyWidgetBundle.swift',
  ];

  // 1. Ajouter App Group au main app
  const withAppGroup: ConfigPlugin = (config) =>
    withEntitlementsPlist(config, (mod) => {
      const ents = mod.modResults;
      if (!Array.isArray(ents['com.apple.security.application-groups'])) {
        ents['com.apple.security.application-groups'] = [];
      }
      const groups = ents['com.apple.security.application-groups'] as string[];
      if (!groups.includes(APP_GROUP)) groups.push(APP_GROUP);
      return mod;
    });

  // 2. Copier les fichiers Swift et ajouter l'extension au projet Xcode
  const withWidgetTarget: ConfigPlugin = (config) =>
    withXcodeProject(config, (mod) => {
      const xcodeProject = mod.modResults;
      const projectRoot = mod.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');
      const widgetDir = path.join(iosDir, WIDGET_TARGET_NAME);
      const sourceDir = path.join(projectRoot, 'targets', 'widget');

      // Créer le dossier widget dans ios/
      if (!fs.existsSync(widgetDir)) {
        fs.mkdirSync(widgetDir, { recursive: true });
      }

      // Copier Info.plist, entitlements et fichiers Swift
      const filesToCopy = [...SWIFT_FILES, 'Info.plist', 'ZeroGaspyWidget.entitlements'];
      for (const file of filesToCopy) {
        const src = path.join(sourceDir, file);
        const dest = path.join(widgetDir, file);
        if (fs.existsSync(src) && !fs.existsSync(dest)) {
          fs.copyFileSync(src, dest);
        }
      }

      // Vérifier si la target widget existe déjà (compare avec guillemets xcode)
      const existingTargets = xcodeProject.pbxNativeTargetSection();
      const alreadyAdded = Object.values(existingTargets).some(
        (t: any) => t && (t.name === `"${WIDGET_TARGET_NAME}"` || t.name === WIDGET_TARGET_NAME)
      );
      if (alreadyAdded) return mod;

      // Ajouter le groupe de fichiers — passer des strings simples, pas des objets
      const widgetGroup = xcodeProject.addPbxGroup(
        SWIFT_FILES,
        WIDGET_TARGET_NAME,
        WIDGET_TARGET_NAME
      );

      // Rattacher au groupe principal
      const mainGroupKey = xcodeProject.getFirstProject().firstProject.mainGroup;
      xcodeProject.addToPbxGroup(widgetGroup.uuid, mainGroupKey);

      // Créer la target extension
      const widgetTarget = xcodeProject.addTarget(
        WIDGET_TARGET_NAME,
        'app_extension',
        WIDGET_TARGET_NAME,
        WIDGET_BUNDLE_ID
      );

      // Build phases
      xcodeProject.addBuildPhase(
        SWIFT_FILES,
        'PBXSourcesBuildPhase',
        'Sources',
        widgetTarget.uuid,
        undefined,
        WIDGET_TARGET_NAME
      );
      xcodeProject.addBuildPhase(
        [],
        'PBXResourcesBuildPhase',
        'Resources',
        widgetTarget.uuid,
        undefined,
        WIDGET_TARGET_NAME
      );
      xcodeProject.addBuildPhase(
        [],
        'PBXFrameworksBuildPhase',
        'Frameworks',
        widgetTarget.uuid,
        undefined,
        WIDGET_TARGET_NAME
      );

      // Build settings — via le buildConfigurationList propre à la target (pas de boucle globale)
      const configListUUID = widgetTarget.pbxNativeTarget.buildConfigurationList;
      const configList = xcodeProject.pbxXCConfigurationListSection()[configListUUID];
      if (configList && configList.buildConfigurations) {
        for (const configRef of configList.buildConfigurations) {
          const configUUID = configRef.value ?? configRef;
          const buildConfig = xcodeProject.pbxXCBuildConfigurationSection()[configUUID];
          if (buildConfig && buildConfig.buildSettings) {
            Object.assign(buildConfig.buildSettings, {
              ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES: 'NO',
              CODE_SIGN_ENTITLEMENTS: `"${WIDGET_TARGET_NAME}/ZeroGaspyWidget.entitlements"`,
              CODE_SIGN_STYLE: 'Automatic',
              DEVELOPMENT_TEAM: 'M32LP7D76G',
              INFOPLIST_FILE: `"${WIDGET_TARGET_NAME}/Info.plist"`,
              LD_RUNPATH_SEARCH_PATHS: '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
              MARKETING_VERSION: '1.0',
              PRODUCT_BUNDLE_IDENTIFIER: WIDGET_BUNDLE_ID,
              PRODUCT_NAME: '"$(TARGET_NAME)"',
              SKIP_INSTALL: 'YES',
              SWIFT_EMIT_LOC_STRINGS: 'YES',
              SWIFT_VERSION: '5.0',
              TARGETED_DEVICE_FAMILY: '"1,2"',
            });
          }
        }
      }

      // Embed Foundation Extensions dans la main app target
      // getFirstTarget() retourne la première target de type application
      const mainTarget = xcodeProject.getFirstTarget();
      if (mainTarget) {
        // 'app_extension' comme 5e arg → dstSubfolderSpec = 13 (PlugIns)
        xcodeProject.addBuildPhase(
          [],
          'PBXCopyFilesBuildPhase',
          'Embed Foundation Extensions',
          mainTarget.uuid,
          'app_extension'
        );

        // Référencer le .appex produit par la widget target
        const productRef = widgetTarget.pbxNativeTarget.productReference;
        if (productRef) {
          const productFile = xcodeProject.pbxFileReferenceSection()[productRef];
          if (productFile) {
            productFile.settings = { ATTRIBUTES: ['RemoveHeadersOnCopy'] };
            xcodeProject.addToPbxCopyfilesBuildPhase(productFile);
          }
        }
      }

      return mod;
    });

  const withIOSWidget: ConfigPlugin = (config) => {
    config = withAppGroup(config);
    config = withWidgetTarget(config);
    return config;
  };

  export default createRunOncePlugin(withIOSWidget, 'withIOSWidget', '1.0.0');
  ```

- [ ] **Step 3 : Commit**

  ```bash
  git add plugins/withIOSWidget.ts
  git commit -m "feat: Config Plugin withIOSWidget pour extension WidgetKit iOS"
  ```

---

## Task 3 : Brancher le plugin dans app.config.ts

**Files:**
- Modify: `app.config.ts`

- [ ] **Step 1 : Ajouter le plugin dans `app.config.ts`**

  > ℹ️ L'entitlement `com.apple.security.application-groups` est déjà présent dans `app.config.ts`. Ne pas le dupliquer.

  Dans `app.config.ts`, dans le tableau `plugins`, ajouter après `['react-native-android-widget', widgetConfig]` :

  ```typescript
  './plugins/withIOSWidget',
  ```

- [ ] **Step 2 : Commit**

  ```bash
  git add app.config.ts
  git commit -m "feat: app.config - ajouter withIOSWidget plugin et App Group entitlement"
  ```

---

## Task 4 : Mettre à jour widgetDataService.ts pour écrire dans l'App Group iOS

**Files:**
- Modify: `widgets/widgetDataService.ts`

- [ ] **Step 1 : Ajouter l'écriture dans UserDefaults App Group**

  Dans `widgets/widgetDataService.ts`, dans la fonction `updateWidgetData`, remplacer le bloc `} else if (Platform.OS === 'ios') { ... }` (actuellement commenté) par :

  ```typescript
  if (Platform.OS === 'android') {
    try {
      const { requestWidgetUpdate } = require('react-native-android-widget');
      await requestWidgetUpdate({
        widgetName: 'ExpiringFoods',
        renderWidget: () => {
          const { ExpiringFoodsWidget } = require('./ExpiringFoodsWidget');
          const React = require('react');
          return React.createElement(ExpiringFoodsWidget, { expiringFoods });
        },
      });
    } catch {
      logger.info('Android widget update skipped (not installed)');
    }
  } else if (Platform.OS === 'ios') {
    try {
      const DefaultPreference = require('react-native-default-preference').default;
      await DefaultPreference.setName('group.com.zerogaspy.app');
      await DefaultPreference.set('widgetData', JSON.stringify(widgetData));
      logger.info('iOS widget data written to App Group UserDefaults');
    } catch (iosError) {
      logger.info('iOS widget update skipped (App Group not configured)');
    }
  }
  ```

  Aussi ajouter `monthlySavings` dans les données envoyées. Modifier la construction de `widgetData` :

  ```typescript
  // Importer getMonthlySavings en haut du fichier
  import { getMonthlySavings } from '../services/monthlySavingsService';

  // Dans updateWidgetData() :
  const expiringFoods = await getExpiringFoods(7);
  const monthlySavings = await getMonthlySavings();
  const widgetData = {
    expiringFoods,
    monthlySavings,
    lastUpdated: new Date().toISOString(),
  };
  ```

- [ ] **Step 2 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

  ```bash
  git add widgets/widgetDataService.ts
  git commit -m "feat: widget data service - ecriture App Group iOS + monthlySavings"
  ```

---

## Task 5 : Deep link `zerogaspy://expiring-soon` → ExpiringSoon

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1 : Ajouter le handler dans `handleDeepLink`**

  Dans `App.tsx`, dans la fonction `handleDeepLink` (ligne ~150), ajouter **avant** le bloc `inviteMatch` :

  ```typescript
  // Widget tap → aliments expirants
  if (url.includes('expiring-soon')) {
    if (navigationRef.isReady()) {
      navigationRef.navigate('ExpiringSoon' as any);
    }
    return;
  }
  ```

- [ ] **Step 2 : Vérifier TypeScript**

  ```bash
  npx tsc --noEmit
  ```

  Attendu : 0 erreur.

- [ ] **Step 3 : Commit**

  ```bash
  git add App.tsx
  git commit -m "feat: deep link zerogaspy://expiring-soon depuis widget iOS"
  ```

---

## Task 6 : Build et test

- [ ] **Step 1 : Build iOS (simulateur)**

  ```bash
  eas build --platform ios --profile preview
  ```

  Si erreur de signature → vérifier Team ID `M32LP7D76G` dans `app.config.ts` et que l'App ID widget est créé sur developer.apple.com.

- [ ] **Step 2 : Vérifier que le widget apparaît**

  Sur le simulateur iOS :
  - Long press sur l'écran d'accueil → `+` → chercher "ZeroGaspy"
  - Tester small (2×2) et medium (4×2)
  - Vérifier couleurs : fond crème `#F7F5E6`, texte vert `#3C6E47`

- [ ] **Step 3 : Vérifier les données**

  - Ouvrir l'app → ajouter un aliment avec date d'expiration proche
  - Revenir sur l'écran d'accueil → le widget doit se mettre à jour dans les 30 minutes
  - Pour forcer le refresh : re-ouvrir l'app (qui appelle `updateWidgetData`)

- [ ] **Step 4 : Vérifier le deep link**

  - Taper sur le widget → l'app doit s'ouvrir sur l'écran `ExpiringSoon`

- [ ] **Step 5 : Build production si tout est OK**

  ```bash
  eas build --platform ios --profile production
  ```

---

## Notes importantes

**App Group dans Xcode (si erreur de signature) :**
Si EAS Build échoue sur les entitlements, ouvrir `ios/ZeroGaspyLocal.xcworkspace` dans Xcode → sélectionner la target `ZeroGaspyWidget` → Signing & Capabilities → `+` Capability → App Groups → cocher `group.com.zerogaspy.app`.

**Dépendance `@expo/config-plugins` :**
Déjà disponible via `expo` — pas d'installation supplémentaire requise.

**Débogage UserDefaults :**
Sur simulateur, vérifier que les données sont écrites :
```swift
// Dans WidgetDataEntry.swift, ajouter temporairement dans loadWidgetPayload() :
print("Widget data:", defaults?.string(forKey: "widgetData") ?? "nil")
```
