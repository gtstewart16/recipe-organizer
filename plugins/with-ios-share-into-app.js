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

function renderShareViewController({ appScheme }) {
  return `import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appScheme = "${appScheme}"

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

    extensionContext?.open(deepLinkURL) { [weak self] _ in
      self?.finish()
    }
  }

  private func finish() {
    extensionContext?.completeRequest(returningItems: nil)
  }
}
`;
}

function renderInfoPlist() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
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
    renderShareViewController({ appScheme: props.appScheme })
  );
  writeFileIfChanged(
    path.join(extensionRoot, `${SHARE_EXTENSION_NAME}-Info.plist`),
    renderInfoPlist()
  );
}

function hasNativeTarget(project, targetName) {
  const nativeTargets = project.pbxNativeTargetSection();
  return Object.values(nativeTargets).some((target) => target?.name === `"${targetName}"`);
}

function addShareExtensionTarget(project, props) {
  if (hasNativeTarget(project, SHARE_EXTENSION_NAME)) {
    return;
  }

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

  const configurations = project.pbxXCBuildConfigurationSection();
  Object.values(configurations).forEach((configuration) => {
    const buildSettings = configuration?.buildSettings;
    if (!buildSettings || buildSettings.PRODUCT_NAME !== `"${SHARE_EXTENSION_NAME}"`) {
      return;
    }

    buildSettings.INFOPLIST_FILE = `"${SHARE_EXTENSION_NAME}/${SHARE_EXTENSION_NAME}-Info.plist"`;
    buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
    buildSettings.DEVELOPMENT_TEAM = buildSettings.DEVELOPMENT_TEAM || '""';
    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = buildSettings.IPHONEOS_DEPLOYMENT_TARGET || '15.1';
    buildSettings.SWIFT_VERSION = '5.0';
  });
}

function withIosShareIntoApp(config, options = {}) {
  const appScheme = options.appScheme ?? config.scheme;
  const extensionBundleIdentifier =
    options.extensionBundleIdentifier ?? `${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}.share`;

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      writeShareExtensionFiles(mod.modRequest.platformProjectRoot, {
        appScheme,
        extensionBundleIdentifier,
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
