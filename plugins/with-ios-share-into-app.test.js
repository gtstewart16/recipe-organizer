const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  SHARE_EXTENSION_NAME,
  addShareExtensionTarget,
  patchAppDelegateForPendingShares,
  writeShareExtensionFiles,
} = require('./with-ios-share-into-app');

describe('with-ios-share-into-app', () => {
  it('writes an iOS share extension that previews URL and text shares before submitting to the app', () => {
    const iosRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kitchen-shelf-share-'));

    writeShareExtensionFiles(iosRoot, {
      appScheme: 'kitchenshelf',
      appGroupIdentifier: 'group.com.gtstewart16.recipeorganizer',
      extensionBundleIdentifier: 'com.gtstewart16.recipeorganizer.share',
      pasteboardName: 'com.gtstewart16.recipeorganizer.pending-share',
      pendingShareDefaultsKey: 'pending-share-url',
    });

    const extensionRoot = path.join(iosRoot, SHARE_EXTENSION_NAME);
    const controller = fs.readFileSync(path.join(extensionRoot, 'ShareViewController.swift'), 'utf8');
    const plist = fs.readFileSync(path.join(extensionRoot, `${SHARE_EXTENSION_NAME}-Info.plist`), 'utf8');
    const appEntitlements = fs.readFileSync(path.join(iosRoot, 'KitchenShelf', 'KitchenShelf.entitlements'), 'utf8');
    const extensionEntitlements = fs.readFileSync(
      path.join(extensionRoot, `${SHARE_EXTENSION_NAME}.entitlements`),
      'utf8'
    );

    expect(controller).toContain('let appScheme = "kitchenshelf"');
    expect(controller).toContain('private let appGroupIdentifier = "group.com.gtstewart16.recipeorganizer"');
    expect(controller).toContain('private let pendingShareDefaultsKey = "pending-share-url"');
    expect(controller).toContain('private let headerLabel = UILabel()');
    expect(controller).toContain('private let submitButton = UIButton(type: .system)');
    expect(controller).toContain('headerLabel.text = "Kitchen Shelf"');
    expect(controller).toContain('submitButton.setTitle("Review Recipe", for: .normal)');
    expect(controller).toContain('statusLabel.text = "Loading shared item..."');
    expect(controller).toContain('urlLabel.text = previewValue');
    expect(controller).toContain('appScheme + "://share?url="');
    expect(controller).toContain('appScheme + "://share?text="');
    expect(controller).toContain('extensionContext?.open(deepLinkURL');
    expect(controller.indexOf('storePendingShare(deepLinkURL)')).toBeLessThan(
      controller.indexOf('extensionContext?.open(deepLinkURL')
    );
    expect(controller).toContain('sel_registerName("openURL:")');
    expect(controller).toContain('currentResponder.perform(openUrlSelector, with: deepLinkURL)');
    expect(controller).toContain('private let pendingSharePasteboardName = UIPasteboard.Name("com.gtstewart16.recipeorganizer.pending-share")');
    expect(controller).toContain('UserDefaults(suiteName: appGroupIdentifier)?.set(deepLinkURL.absoluteString, forKey: pendingShareDefaultsKey)');
    expect(controller).toContain('UIPasteboard(name: pendingSharePasteboardName, create: true)');
    expect(controller).toContain('pasteboard?.string = deepLinkURL.absoluteString');

    expect(plist).toContain('NSExtensionActivationSupportsWebURLWithMaxCount');
    expect(plist).toContain('NSExtensionActivationSupportsText');
    expect(plist).toContain('com.apple.share-services');
    expect(plist).toContain('CFBundleIdentifier');
    expect(plist).toContain('$(PRODUCT_BUNDLE_IDENTIFIER)');
    expect(plist).toContain('CFBundleExecutable');
    expect(plist).toContain('$(EXECUTABLE_NAME)');
    expect(appEntitlements).toContain('group.com.gtstewart16.recipeorganizer');
    expect(extensionEntitlements).toContain('group.com.gtstewart16.recipeorganizer');
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

  it('adds app group entitlements to the share extension build settings', () => {
    const configurations = {
      debug: {
        buildSettings: {
          PRODUCT_NAME: `"${SHARE_EXTENSION_NAME}"`,
        },
      },
      appDebug: {
        buildSettings: {
          PRODUCT_NAME: '"KitchenShelf"',
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

    expect(configurations.debug.buildSettings.CODE_SIGN_ENTITLEMENTS).toBe(
      `"${SHARE_EXTENSION_NAME}/${SHARE_EXTENSION_NAME}.entitlements"`
    );
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

  it('patches the app delegate to consume a pending pasteboard share when the app becomes active', () => {
    const appDelegate = `import Expo
import React

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
}
`;

    const patched = patchAppDelegateForPendingShares(
      appDelegate,
      'kitchenshelf',
      'com.gtstewart16.recipeorganizer.pending-share',
      'group.com.gtstewart16.recipeorganizer',
      'pending-share-url'
    );

    expect(patched).toContain('import UIKit');
    expect(patched).toContain('let linkingResult = RCTLinkingManager.application(app, open: url, options: options)');
    expect(patched).toContain('return linkingResult || super.application(app, open: url, options: options)');
    expect(patched).toContain('private let kitchenShelfPendingSharePasteboardPrefix = "kitchenshelf://share"');
    expect(patched).toContain('private let kitchenShelfShareAppGroupIdentifier = "group.com.gtstewart16.recipeorganizer"');
    expect(patched).toContain('private let kitchenShelfPendingShareDefaultsKey = "pending-share-url"');
    expect(patched).toContain(
      'private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("com.gtstewart16.recipeorganizer.pending-share")'
    );
    expect(patched).toContain('public override func applicationDidBecomeActive(_ application: UIApplication)');
    expect(patched).toContain('UserDefaults(suiteName: kitchenShelfShareAppGroupIdentifier)');
    expect(patched).toContain('pendingShareDefaults.removeObject(forKey: kitchenShelfPendingShareDefaultsKey)');
    expect(patched).toContain('UIPasteboard(name: kitchenShelfPendingSharePasteboardName, create: false)');
    expect(patched).toContain('pendingSharePasteboard.string?.trimmingCharacters');
    expect(patched).toContain('pendingSharePasteboard.string = ""');
    expect(patched).toContain('RCTLinkingManager.application(application, open: pendingShareURL, options: [:])');
  });

  it('patches the app delegate idempotently', () => {
    const appDelegate = `import UIKit
import Expo
import React

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  private let kitchenShelfPendingSharePasteboardPrefix = "kitchenshelf://share"
  private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("com.gtstewart16.recipeorganizer.pending-share")

  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    handleKitchenShelfPendingSharePasteboardURL(application)
  }

  private func handleKitchenShelfPendingSharePasteboardURL(_ application: UIApplication) {
    guard
      let pendingSharePasteboard = UIPasteboard(name: kitchenShelfPendingSharePasteboardName, create: false),
      let pendingShare = pendingSharePasteboard.string?.trimmingCharacters(in: .whitespacesAndNewlines),
      pendingShare.hasPrefix(kitchenShelfPendingSharePasteboardPrefix),
      let pendingShareURL = URL(string: pendingShare)
    else {
      return
    }

    pendingSharePasteboard.string = ""
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
      _ = RCTLinkingManager.application(application, open: pendingShareURL, options: [:])
    }
  }

  // Universal Links
}
`;

    const patched = patchAppDelegateForPendingShares(
      appDelegate,
      'kitchenshelf',
      'com.gtstewart16.recipeorganizer.pending-share',
      'group.com.gtstewart16.recipeorganizer',
      'pending-share-url'
    );

    expect(patched.match(/kitchenShelfPendingSharePasteboardPrefix/g)).toHaveLength(3);
    expect(patched.match(/kitchenShelfPendingSharePasteboardName/g)).toHaveLength(2);
    expect(patched.match(/kitchenShelfShareAppGroupIdentifier/g)).toHaveLength(2);
    expect(patched.match(/kitchenShelfPendingShareDefaultsKey/g)).toHaveLength(3);
    expect(patched.match(/public override func applicationDidBecomeActive/g)).toHaveLength(1);
  });

  it('migrates an existing general pasteboard fallback to the named share pasteboard', () => {
    const appDelegate = `import UIKit
import Expo
import React

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  private let kitchenShelfPendingSharePasteboardPrefix = "kitchenshelf://share"
  var window: UIWindow?

  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    handleKitchenShelfPendingSharePasteboardURL(application)
  }

  private func handleKitchenShelfPendingSharePasteboardURL(_ application: UIApplication) {
    guard
      let pendingShare = UIPasteboard.general.string?.trimmingCharacters(in: .whitespacesAndNewlines),
      pendingShare.hasPrefix(kitchenShelfPendingSharePasteboardPrefix),
      let pendingShareURL = URL(string: pendingShare)
    else {
      return
    }

    UIPasteboard.general.string = ""
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
      _ = RCTLinkingManager.application(application, open: pendingShareURL, options: [:])
    }
  }

  // Universal Links
}
`;

    const patched = patchAppDelegateForPendingShares(
      appDelegate,
      'kitchenshelf',
      'com.gtstewart16.recipeorganizer.pending-share',
      'group.com.gtstewart16.recipeorganizer',
      'pending-share-url'
    );

    expect(patched).toContain(
      'private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("com.gtstewart16.recipeorganizer.pending-share")'
    );
    expect(patched).toContain('UIPasteboard(name: kitchenShelfPendingSharePasteboardName, create: false)');
    expect(patched).toContain('pendingSharePasteboard.string = ""');
    expect(patched).not.toContain('UIPasteboard.general');
  });
});
