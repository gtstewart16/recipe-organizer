const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  SHARE_EXTENSION_NAME,
  addShareExtensionTarget,
  writeShareExtensionFiles,
} = require('./with-ios-share-into-app');

describe('with-ios-share-into-app', () => {
  it('writes an iOS share extension that hands URL and text shares to the app deep link', () => {
    const iosRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kitchen-shelf-share-'));

    writeShareExtensionFiles(iosRoot, {
      appScheme: 'kitchenshelf',
      extensionBundleIdentifier: 'com.gtstewart16.recipeorganizer.share',
    });

    const extensionRoot = path.join(iosRoot, SHARE_EXTENSION_NAME);
    const controller = fs.readFileSync(path.join(extensionRoot, 'ShareViewController.swift'), 'utf8');
    const plist = fs.readFileSync(path.join(extensionRoot, `${SHARE_EXTENSION_NAME}-Info.plist`), 'utf8');

    expect(controller).toContain('let appScheme = "kitchenshelf"');
    expect(controller).toContain('appScheme + "://share?url="');
    expect(controller).toContain('appScheme + "://share?text="');
    expect(controller).toContain('extensionContext?.open(deepLinkURL');
    expect(controller).toContain('sel_registerName("openURL:")');
    expect(controller).toContain('currentResponder.perform(openUrlSelector, with: deepLinkURL)');

    expect(plist).toContain('NSExtensionActivationSupportsWebURLWithMaxCount');
    expect(plist).toContain('NSExtensionActivationSupportsText');
    expect(plist).toContain('com.apple.share-services');
    expect(plist).toContain('CFBundleIdentifier');
    expect(plist).toContain('$(PRODUCT_BUNDLE_IDENTIFIER)');
    expect(plist).toContain('CFBundleExecutable');
    expect(plist).toContain('$(EXECUTABLE_NAME)');
  });

  it('adds the Swift file through the target sources phase without requiring a Plugins group', () => {
    const calls = [];
    const project = {
      pbxNativeTargetSection: () => ({}),
      addTarget: () => ({ uuid: 'SHARE_TARGET' }),
      addBuildPhase: (files, type, comment, target) => {
        calls.push({ files, type, comment, target });
      },
      addSourceFile: () => {
        throw new Error('Plugins group is missing');
      },
      pbxXCBuildConfigurationSection: () => ({
        debug: {
          buildSettings: {
            PRODUCT_NAME: `"${SHARE_EXTENSION_NAME}"`,
          },
        },
      }),
    };

    addShareExtensionTarget(project, {
      extensionBundleIdentifier: 'com.gtstewart16.recipeorganizer.share',
    });

    expect(calls).toContainEqual({
      files: [`${SHARE_EXTENSION_NAME}/ShareViewController.swift`],
      type: 'PBXSourcesBuildPhase',
      comment: 'Sources',
      target: 'SHARE_TARGET',
    });
  });

  it('updates an existing share extension target with bundle and version settings', () => {
    const configurations = {
      debug: {
        buildSettings: {
          PRODUCT_NAME: `"${SHARE_EXTENSION_NAME}"`,
        },
      },
    };
    const project = {
      pbxNativeTargetSection: () => ({
        existingTarget: {
          name: `"${SHARE_EXTENSION_NAME}"`,
        },
      }),
      addTarget: jest.fn(),
      addBuildPhase: jest.fn(),
      pbxXCBuildConfigurationSection: () => configurations,
    };

    addShareExtensionTarget(project, {
      extensionBundleIdentifier: 'com.gtstewart16.recipeorganizer.share',
    });

    const buildSettings = configurations.debug.buildSettings;
    expect(project.addTarget).not.toHaveBeenCalled();
    expect(buildSettings.CURRENT_PROJECT_VERSION).toBe('1');
    expect(buildSettings.MARKETING_VERSION).toBe('1.0.0');
    expect(buildSettings.PRODUCT_BUNDLE_IDENTIFIER).toBe('"com.gtstewart16.recipeorganizer.share"');
    expect(buildSettings.PRODUCT_BUNDLE_PACKAGE_TYPE).toBe('"XPC!"');
  });

  it('treats quoted and unquoted existing share extension targets as already present', () => {
    const configurations = {
      debug: {
        buildSettings: {
          PRODUCT_NAME: `"${SHARE_EXTENSION_NAME}"`,
        },
      },
    };
    const project = {
      pbxNativeTargetSection: () => ({
        existingTarget: {
          name: SHARE_EXTENSION_NAME,
        },
      }),
      addTarget: jest.fn(),
      addBuildPhase: jest.fn(),
      pbxXCBuildConfigurationSection: () => configurations,
    };

    addShareExtensionTarget(project, {
      extensionBundleIdentifier: 'com.gtstewart16.recipeorganizer.share',
    });

    expect(project.addTarget).not.toHaveBeenCalled();
  });
});
