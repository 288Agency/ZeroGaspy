import {
  ConfigPlugin,
  withXcodeProject,
  withEntitlementsPlist,
  createRunOncePlugin,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

const APP_GROUP = 'group.com.zerogaspy.app.widget';
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

    // Vérifier si la target widget existe déjà
    const existingTargets = xcodeProject.pbxNativeTargetSection();
    const alreadyAdded = Object.values(existingTargets).some(
      (t: any) => t && (t.name === `"${WIDGET_TARGET_NAME}"` || t.name === WIDGET_TARGET_NAME)
    );
    if (alreadyAdded) return mod;

    // Ajouter le groupe de fichiers — strings simples (pas des objets)
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

    // Build settings via le buildConfigurationList propre à la target
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
            LD_RUNPATH_SEARCH_PATHS:
              '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
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
    const mainTarget = xcodeProject.getFirstTarget();
    if (mainTarget) {
      // 'app_extension' → dstSubfolderSpec = 13 (PlugIns)
      xcodeProject.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed Foundation Extensions',
        mainTarget.uuid,
        'app_extension'
      );

      // Ajouter le .appex produit par la widget target à la phase embed
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
