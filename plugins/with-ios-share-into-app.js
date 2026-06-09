const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const SHARE_EXTENSION_NAME = 'KitchenShelfShare';

function writeFileIfChanged(filePath, contents) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, 'utf8') === contents) {
    return;
  }

  fs.writeFileSync(filePath, contents);
}

function renderShareViewController({ appScheme, pasteboardName }) {
  return `import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appScheme = "${appScheme}"
  private let pendingSharePasteboardName = UIPasteboard.Name("${pasteboardName}")

  override func viewDidLoad() {
    super.viewDidLoad()
    view.isHidden = true
    openFirstSharedPayload()
  }

  private func openFirstSharedPayload() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else {
      finish()
      return
    }

    let attachments = extensionItem.attachments ?? []
    if openFirstItem(matching: UTType.url.identifier, from: attachments, queryName: "url") {
      return
    }

    if openFirstItem(matching: UTType.plainText.identifier, from: attachments, queryName: "text") {
      return
    }

    finish()
  }

  private func openFirstItem(matching typeIdentifier: String, from attachments: [NSItemProvider], queryName: String) -> Bool {
    guard let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(typeIdentifier) }) else {
      return false
    }

    provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { [weak self] item, _ in
      let value: String
      if let url = item as? URL {
        value = url.absoluteString
      } else if let text = item as? String {
        value = text
      } else {
        value = ""
      }

      DispatchQueue.main.async {
        self?.openApp(queryName: queryName, value: value)
      }
    }

    return true
  }

  private func openApp(queryName: String, value: String) {
    let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedValue.isEmpty else {
      finish()
      return
    }

    var allowedCharacters = CharacterSet.urlQueryAllowed
    allowedCharacters.remove(charactersIn: "&+=")

    let urlPrefix = queryName == "url" ? appScheme + "://share?url=" : appScheme + "://share?text="
    guard
      let encodedValue = trimmedValue.addingPercentEncoding(withAllowedCharacters: allowedCharacters),
      let deepLinkURL = URL(string: urlPrefix + encodedValue)
    else {
      finish()
      return
    }

    extensionContext?.open(deepLinkURL) { [weak self] didOpen in
      if didOpen {
        self?.finish()
      } else {
        self?.openViaResponderChain(deepLinkURL)
      }
    }
  }

  private func openViaResponderChain(_ deepLinkURL: URL) {
    storePendingShare(deepLinkURL)

    let openUrlSelector = sel_registerName("openURL:")
    var responder: UIResponder? = self

    while let currentResponder = responder {
      if currentResponder.responds(to: openUrlSelector) {
        currentResponder.perform(openUrlSelector, with: deepLinkURL)
        finish()
        return
      }

      responder = currentResponder.next
    }

    finish()
  }

  private func storePendingShare(_ deepLinkURL: URL) {
    let pasteboard = UIPasteboard(name: pendingSharePasteboardName, create: true)
    pasteboard?.string = deepLinkURL.absoluteString
  }

  private func finish() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}
`;
}

function patchAppDelegateForPendingShares(contents, appScheme, pasteboardName) {
  let nextContents = contents;

  if (!nextContents.includes('import UIKit')) {
    nextContents = nextContents.replace(/^(import .+)$/m, 'import UIKit\n$1');
  }

  if (!nextContents.includes('kitchenShelfPendingSharePasteboardPrefix')) {
    nextContents = nextContents.replace(
      /public class AppDelegate: ExpoAppDelegate \{/,
      `public class AppDelegate: ExpoAppDelegate {
  private let kitchenShelfPendingSharePasteboardPrefix = "${appScheme}://share"
  private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("${pasteboardName}")`
    );
  }

  if (!nextContents.includes('handleKitchenShelfPendingSharePasteboardURL')) {
    nextContents = nextContents.replace(
      /  \/\/ Universal Links\n/,
      `  public override func applicationDidBecomeActive(_ application: UIApplication) {
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

  // Universal Links\n`
    );
  }

  return nextContents;
}

function renderInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>$(DEVELOPMENT_LANGUAGE)</string>
  <key>CFBundleDisplayName</key>
  <string>Kitchen Shelf</string>
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
    <key>NSExtensionAttributes</key>
    <dict>
      <key>NSExtensionActivationRule</key>
      <dict>
        <key>NSExtensionActivationSupportsText</key>
        <true/>
        <key>NSExtensionActivationSupportsWebURLWithMaxCount</key>
        <integer>1</integer>
      </dict>
    </dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.share-services</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).ShareViewController</string>
  </dict>
</dict>
</plist>
`;
}

function writeShareExtensionFiles(iosRoot, props) {
  const extensionRoot = path.join(iosRoot, SHARE_EXTENSION_NAME);
  fs.mkdirSync(extensionRoot, { recursive: true });

  writeFileIfChanged(
    path.join(extensionRoot, 'ShareViewController.swift'),
    renderShareViewController({ appScheme: props.appScheme, pasteboardName: props.pasteboardName })
  );
  writeFileIfChanged(
    path.join(extensionRoot, `${SHARE_EXTENSION_NAME}-Info.plist`),
    renderInfoPlist()
  );

  const appDelegatePath = path.join(iosRoot, 'KitchenShelf', 'AppDelegate.swift');
  if (fs.existsSync(appDelegatePath)) {
    writeFileIfChanged(
      appDelegatePath,
      patchAppDelegateForPendingShares(
        fs.readFileSync(appDelegatePath, 'utf8'),
        props.appScheme,
        props.pasteboardName
      )
    );
  }
}

function hasNativeTarget(project, targetName) {
  const nativeTargets = project.pbxNativeTargetSection();
  return Object.values(nativeTargets).some((target) => normalizePbxValue(target?.name) === targetName);
}

function normalizePbxValue(value) {
  return typeof value === 'string' ? value.replace(/^"|"$/g, '') : value;
}

function updateShareExtensionBuildSettings(project, props) {
  const configurations = project.pbxXCBuildConfigurationSection();
  Object.values(configurations).forEach((configuration) => {
    const buildSettings = configuration?.buildSettings;
    if (!buildSettings || normalizePbxValue(buildSettings.PRODUCT_NAME) !== SHARE_EXTENSION_NAME) {
      return;
    }

    buildSettings.INFOPLIST_FILE = `"${SHARE_EXTENSION_NAME}/${SHARE_EXTENSION_NAME}-Info.plist"`;
    buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
    buildSettings.CURRENT_PROJECT_VERSION = buildSettings.CURRENT_PROJECT_VERSION || '1';
    buildSettings.DEVELOPMENT_TEAM = buildSettings.DEVELOPMENT_TEAM || '""';
    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = buildSettings.IPHONEOS_DEPLOYMENT_TARGET || '15.1';
    buildSettings.MARKETING_VERSION = buildSettings.MARKETING_VERSION || '1.0.0';
    buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${props.extensionBundleIdentifier}"`;
    buildSettings.PRODUCT_BUNDLE_PACKAGE_TYPE = '"XPC!"';
    buildSettings.SWIFT_VERSION = '5.0';
  });
}

function addShareExtensionTarget(project, props) {
  if (!hasNativeTarget(project, SHARE_EXTENSION_NAME)) {
    const target = project.addTarget(
      SHARE_EXTENSION_NAME,
      'app_extension',
      SHARE_EXTENSION_NAME,
      props.extensionBundleIdentifier
    );

    project.addBuildPhase(
      [`${SHARE_EXTENSION_NAME}/ShareViewController.swift`],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid
    );
  }

  updateShareExtensionBuildSettings(project, props);
}

function withIosShareIntoApp(config, options = {}) {
  const appScheme = options.appScheme ?? config.scheme;
  const extensionBundleIdentifier =
    options.extensionBundleIdentifier ?? `${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}.share`;
  const pasteboardName =
    options.pasteboardName ?? `${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}.pending-share`;

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      writeShareExtensionFiles(mod.modRequest.platformProjectRoot, {
        appScheme,
        extensionBundleIdentifier,
        pasteboardName,
      });
      return mod;
    },
  ]);

  config = withXcodeProject(config, (mod) => {
    addShareExtensionTarget(mod.modResults, {
      extensionBundleIdentifier,
    });
    return mod;
  });

  return config;
}

module.exports = withIosShareIntoApp;
module.exports.SHARE_EXTENSION_NAME = SHARE_EXTENSION_NAME;
module.exports.writeShareExtensionFiles = writeShareExtensionFiles;
module.exports.addShareExtensionTarget = addShareExtensionTarget;
module.exports.patchAppDelegateForPendingShares = patchAppDelegateForPendingShares;
