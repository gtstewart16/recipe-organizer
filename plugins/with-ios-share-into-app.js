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

function renderShareViewController({ appScheme, appGroupIdentifier, pasteboardName, pendingShareDefaultsKey }) {
  return `import UIKit
import UniformTypeIdentifiers

final class ShareViewController: UIViewController {
  private let appScheme = "${appScheme}"
  private let appGroupIdentifier = "${appGroupIdentifier}"
  private let pendingShareDefaultsKey = "${pendingShareDefaultsKey}"
  private let pendingShareFileName = "pending-share-url.txt"
  private let pendingSharePasteboardName = UIPasteboard.Name("${pasteboardName}")
  private var pendingDeepLinkURL: URL?

  private let headerLabel = UILabel()
  private let statusLabel = UILabel()
  private let titleLabel = UILabel()
  private let urlLabel = UILabel()
  private let submitButton = UIButton(type: .system)

  override func viewDidLoad() {
    super.viewDidLoad()
    buildPreviewInterface()
    loadFirstSharedPayload()
  }

  private func buildPreviewInterface() {
    view.backgroundColor = .systemGroupedBackground

    let closeButton = UIButton(type: .system)
    closeButton.setTitle("Cancel", for: .normal)
    closeButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    closeButton.addTarget(self, action: #selector(cancelShare), for: .touchUpInside)

    headerLabel.text = "Kitchen Shelf"
    headerLabel.font = .systemFont(ofSize: 26, weight: .bold)
    headerLabel.textAlignment = .center
    headerLabel.textColor = .label

    submitButton.setTitle("Review Recipe", for: .normal)
    submitButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .bold)
    submitButton.backgroundColor = .systemBlue
    submitButton.tintColor = .white
    submitButton.layer.cornerRadius = 22
    submitButton.contentEdgeInsets = UIEdgeInsets(top: 12, left: 18, bottom: 12, right: 18)
    submitButton.isEnabled = false
    submitButton.alpha = 0.45
    submitButton.addTarget(self, action: #selector(submitShare), for: .touchUpInside)

    let headerRow = UIStackView(arrangedSubviews: [closeButton, headerLabel, submitButton])
    headerRow.axis = .horizontal
    headerRow.alignment = .center
    headerRow.spacing = 12

    closeButton.widthAnchor.constraint(equalToConstant: 104).isActive = true
    submitButton.widthAnchor.constraint(equalToConstant: 148).isActive = true

    statusLabel.text = "Loading shared item..."
    statusLabel.font = .systemFont(ofSize: 15, weight: .semibold)
    statusLabel.textColor = .secondaryLabel
    statusLabel.numberOfLines = 0

    titleLabel.text = "Shared recipe link"
    titleLabel.font = .systemFont(ofSize: 22, weight: .bold)
    titleLabel.textColor = .label
    titleLabel.numberOfLines = 3

    urlLabel.text = "Waiting for Safari..."
    urlLabel.font = .systemFont(ofSize: 16, weight: .regular)
    urlLabel.textColor = .systemBlue
    urlLabel.numberOfLines = 4

    let sourceLabel = UILabel()
    sourceLabel.text = "Open Kitchen Shelf to review ingredients, groups, and directions before saving."
    sourceLabel.font = .systemFont(ofSize: 15, weight: .regular)
    sourceLabel.textColor = .secondaryLabel
    sourceLabel.numberOfLines = 0

    let cardStack = UIStackView(arrangedSubviews: [statusLabel, titleLabel, urlLabel, sourceLabel])
    cardStack.axis = .vertical
    cardStack.spacing = 12
    cardStack.translatesAutoresizingMaskIntoConstraints = false

    let card = UIView()
    card.backgroundColor = .secondarySystemGroupedBackground
    card.layer.cornerRadius = 22
    card.translatesAutoresizingMaskIntoConstraints = false
    card.addSubview(cardStack)

    NSLayoutConstraint.activate([
      cardStack.topAnchor.constraint(equalTo: card.topAnchor, constant: 22),
      cardStack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 22),
      cardStack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -22),
      cardStack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -22),
    ])

    let rootStack = UIStackView(arrangedSubviews: [headerRow, card])
    rootStack.axis = .vertical
    rootStack.spacing = 32
    rootStack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(rootStack)

    NSLayoutConstraint.activate([
      rootStack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 28),
      rootStack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 18),
      rootStack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -18),
    ])
  }

  private func loadFirstSharedPayload() {
    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem else {
      showUnsupportedShare()
      return
    }

    let attachments = extensionItem.attachments ?? []
    let previewTitle = preferredTitle(from: extensionItem)

    if loadFirstItem(matching: UTType.url.identifier, from: attachments, queryName: "url", previewTitle: previewTitle) {
      return
    }

    if loadFirstItem(matching: UTType.plainText.identifier, from: attachments, queryName: "text", previewTitle: previewTitle) {
      return
    }

    if loadFallbackItem(from: attachments, previewTitle: previewTitle) {
      return
    }

    showUnsupportedShare()
  }

  private func loadFirstItem(matching typeIdentifier: String, from attachments: [NSItemProvider], queryName: String, previewTitle: String) -> Bool {
    guard let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(typeIdentifier) }) else {
      return false
    }

    provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { [weak self] item, _ in
      let value: String
      if let url = item as? URL {
        value = url.absoluteString
      } else if let url = item as? NSURL {
        value = url.absoluteString ?? ""
      } else if let text = item as? String {
        value = text
      } else if let text = item as? NSString {
        value = text as String
      } else {
        value = ""
      }

      DispatchQueue.main.async {
        self?.prepareShare(queryName: queryName, value: value, previewTitle: previewTitle)
      }
    }

    return true
  }

  private func loadFallbackItem(from attachments: [NSItemProvider], previewTitle: String) -> Bool {
    let fallbackTypeIdentifiers = [
      UTType.propertyList.identifier,
      UTType.item.identifier,
      UTType.data.identifier,
    ]

    for typeIdentifier in fallbackTypeIdentifiers {
      guard let provider = attachments.first(where: { $0.hasItemConformingToTypeIdentifier(typeIdentifier) }) else {
        continue
      }

      provider.loadItem(forTypeIdentifier: typeIdentifier, options: nil) { [weak self] item, _ in
        let payload = self?.extractSharedPayload(from: item)

        DispatchQueue.main.async {
          guard let payload else {
            self?.showUnsupportedShare()
            return
          }

          self?.prepareShare(queryName: payload.queryName, value: payload.value, previewTitle: previewTitle)
        }
      }

      return true
    }

    return false
  }

  private func extractSharedPayload(from item: Any?) -> (queryName: String, value: String)? {
    if let url = item as? URL {
      return ("url", url.absoluteString)
    }

    if let url = item as? NSURL, let value = url.absoluteString {
      return ("url", value)
    }

    if let text = item as? String {
      return extractPayloadFromText(text)
    }

    if let text = item as? NSString {
      return extractPayloadFromText(text as String)
    }

    if let attributedText = item as? NSAttributedString {
      return extractPayloadFromText(attributedText.string)
    }

    if let dictionary = item as? [AnyHashable: Any] {
      return extractPayloadFromDictionary(dictionary)
    }

    if let array = item as? [Any] {
      return extractPayloadFromArray(array)
    }

    if let data = item as? Data, let text = String(data: data, encoding: .utf8) {
      return extractPayloadFromText(text)
    }

    if let data = item as? NSData, let text = String(data: data as Data, encoding: .utf8) {
      return extractPayloadFromText(text)
    }

    return nil
  }

  private func extractPayloadFromDictionary(_ dictionary: [AnyHashable: Any]) -> (queryName: String, value: String)? {
    let preferredKeys = [
      "URL",
      "url",
      "public.url",
      "NSExtensionJavaScriptPreprocessingResultsKey",
      "text",
      "title",
      "name",
    ]

    for key in preferredKeys {
      if let payload = extractSharedPayload(from: dictionary[key]) {
        return payload
      }
    }

    for value in dictionary.values {
      if let payload = extractSharedPayload(from: value) {
        return payload
      }
    }

    return nil
  }

  private func extractPayloadFromArray(_ array: [Any]) -> (queryName: String, value: String)? {
    for item in array {
      if let payload = extractSharedPayload(from: item) {
        return payload
      }
    }

    return nil
  }

  private func extractPayloadFromText(_ text: String) -> (queryName: String, value: String)? {
    let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedText.isEmpty else {
      return nil
    }

    if let url = firstHttpUrl(in: trimmedText) {
      return ("url", url)
    }

    return ("text", trimmedText)
  }

  private func firstHttpUrl(in text: String) -> String? {
    guard
      let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    else {
      return nil
    }

    let range = NSRange(text.startIndex..<text.endIndex, in: text)
    let match = detector.firstMatch(in: text, options: [], range: range)
    guard
      let url = match?.url,
      url.scheme == "http" || url.scheme == "https"
    else {
      return nil
    }

    return url.absoluteString
  }

  private func preferredTitle(from item: NSExtensionItem) -> String {
    let candidates = [
      item.attributedTitle?.string,
      item.attributedContentText?.string,
    ]

    for candidate in candidates {
      let trimmedCandidate = candidate?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      if !trimmedCandidate.isEmpty {
        return trimmedCandidate
      }
    }

    return "Shared recipe link"
  }

  private func prepareShare(queryName: String, value: String, previewTitle: String) {
    let trimmedValue = value.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmedValue.isEmpty else {
      showUnsupportedShare()
      return
    }

    var allowedCharacters = CharacterSet.urlQueryAllowed
    allowedCharacters.remove(charactersIn: "&+=")

    let urlPrefix = queryName == "url" ? appScheme + "://share?url=" : appScheme + "://share?text="
    guard
      let encodedValue = trimmedValue.addingPercentEncoding(withAllowedCharacters: allowedCharacters),
      let deepLinkURL = URL(string: urlPrefix + encodedValue)
    else {
      showUnsupportedShare()
      return
    }

    pendingDeepLinkURL = deepLinkURL
    showPreview(title: previewTitle, previewValue: trimmedValue)
  }

  private func showPreview(title: String, previewValue: String) {
    statusLabel.text = "Ready to review"
    titleLabel.text = title
    urlLabel.text = previewValue
    submitButton.isEnabled = true
    submitButton.alpha = 1
  }

  private func showUnsupportedShare() {
    statusLabel.text = "Kitchen Shelf could not read this shared item."
    titleLabel.text = "Try sharing the recipe page URL"
    urlLabel.text = "Safari recipe links work best right now."
    submitButton.isEnabled = false
    submitButton.alpha = 0.45
  }

  @objc private func cancelShare() {
    finish()
  }

  @objc private func submitShare() {
    guard let deepLinkURL = pendingDeepLinkURL else {
      showUnsupportedShare()
      return
    }

    submitButton.isEnabled = false
    submitButton.alpha = 0.65
    statusLabel.text = "Sending to Kitchen Shelf..."

    storePendingShare(deepLinkURL)
    extensionContext?.open(deepLinkURL) { [weak self] didOpen in
      if didOpen {
        self?.finish()
      } else {
        self?.openViaResponderChain(deepLinkURL)
        self?.finishAfterForegroundAttempt()
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
        return
      }

      responder = currentResponder.next
    }
  }

  private func storePendingShare(_ deepLinkURL: URL) {
    UserDefaults(suiteName: appGroupIdentifier)?.set(deepLinkURL.absoluteString, forKey: pendingShareDefaultsKey)
    if let appGroupURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
      try? deepLinkURL.absoluteString.write(
        to: appGroupURL.appendingPathComponent(pendingShareFileName),
        atomically: true,
        encoding: .utf8
      )
    }
    let pasteboard = UIPasteboard(name: pendingSharePasteboardName, create: true)
    pasteboard?.string = deepLinkURL.absoluteString
  }

  private func finish() {
    extensionContext?.completeRequest(returningItems: nil)
  }

  private func finishAfterForegroundAttempt() {
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { [weak self] in
      self?.finish()
    }
  }
}
`;
}

function patchAppDelegateForPendingShares(contents, appScheme, pasteboardName, appGroupIdentifier, pendingShareDefaultsKey) {
  let nextContents = contents;

  nextContents = nextContents.replace(
    /\n@objc\(KitchenShelfPendingShare\)\nclass KitchenShelfPendingShare: NSObject, RCTBridgeModule \{[\s\S]*?\n\}\n(?=\nclass ReactNativeDelegate:|\n?$)/,
    '\n'
  );

  if (!nextContents.includes('import UIKit')) {
    nextContents = nextContents.replace(/^(import .+)$/m, 'import UIKit\n$1');
  }

  nextContents = nextContents.replace(
    'return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)',
    `let linkingResult = RCTLinkingManager.application(app, open: url, options: options)
    return linkingResult || super.application(app, open: url, options: options)`
  );

  if (!nextContents.includes('kitchenShelfPendingSharePasteboardPrefix')) {
    nextContents = nextContents.replace(
      /public class AppDelegate: ExpoAppDelegate \{/,
      `public class AppDelegate: ExpoAppDelegate {
  private let kitchenShelfPendingSharePasteboardPrefix = "${appScheme}://share"
  private let kitchenShelfShareAppGroupIdentifier = "${appGroupIdentifier}"
  private let kitchenShelfPendingShareDefaultsKey = "${pendingShareDefaultsKey}"
  private let kitchenShelfPendingShareFileName = "pending-share-url.txt"
  private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("${pasteboardName}")`
    );
  }

  if (
    nextContents.includes('kitchenShelfPendingSharePasteboardPrefix') &&
    !nextContents.includes('kitchenShelfShareAppGroupIdentifier')
  ) {
    nextContents = nextContents.replace(
      /  private let kitchenShelfPendingSharePasteboardPrefix = .+\n/,
      (match) =>
        `${match}  private let kitchenShelfShareAppGroupIdentifier = "${appGroupIdentifier}"\n  private let kitchenShelfPendingShareDefaultsKey = "${pendingShareDefaultsKey}"\n`
    );
  }

  if (
    nextContents.includes('kitchenShelfPendingSharePasteboardPrefix') &&
    !nextContents.includes('kitchenShelfPendingShareFileName')
  ) {
    nextContents = nextContents.replace(
      /  private let kitchenShelfPendingShareDefaultsKey = .+\n/,
      (match) => `${match}  private let kitchenShelfPendingShareFileName = "pending-share-url.txt"\n`
    );
  }

  if (
    nextContents.includes('kitchenShelfPendingSharePasteboardPrefix') &&
    !nextContents.includes('kitchenShelfPendingSharePasteboardName')
  ) {
    nextContents = nextContents.replace(
      /  private let kitchenShelfPendingSharePasteboardPrefix = .+\n/,
      (match) => `${match}  private let kitchenShelfPendingSharePasteboardName = UIPasteboard.Name("${pasteboardName}")\n`
    );
  }

  const pendingShareHandler = `  private func handleKitchenShelfPendingSharePasteboardURL(_ application: UIApplication) {
    if
      let pendingShareDefaults = UserDefaults(suiteName: kitchenShelfShareAppGroupIdentifier),
      let pendingShare = pendingShareDefaults.string(forKey: kitchenShelfPendingShareDefaultsKey)?.trimmingCharacters(in: .whitespacesAndNewlines),
      pendingShare.hasPrefix(kitchenShelfPendingSharePasteboardPrefix),
      let pendingShareURL = URL(string: pendingShare)
    {
      deliverKitchenShelfPendingShare(pendingShareURL, remainingAttempts: 6)
      DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) { [weak self] in
        guard let self else {
          return
        }

        pendingShareDefaults.removeObject(forKey: self.kitchenShelfPendingShareDefaultsKey)
      }
      return
    }

    if
      let pendingShareFileURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: kitchenShelfShareAppGroupIdentifier)?.appendingPathComponent(kitchenShelfPendingShareFileName),
      let pendingShare = try? String(contentsOf: pendingShareFileURL, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines),
      pendingShare.hasPrefix(kitchenShelfPendingSharePasteboardPrefix),
      let pendingShareURL = URL(string: pendingShare)
    {
      deliverKitchenShelfPendingShare(pendingShareURL, remainingAttempts: 6)
      DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
        try? FileManager.default.removeItem(at: pendingShareFileURL)
      }
      return
    }

    guard
      let pendingSharePasteboard = UIPasteboard(name: kitchenShelfPendingSharePasteboardName, create: false),
      let pendingShare = pendingSharePasteboard.string?.trimmingCharacters(in: .whitespacesAndNewlines),
      pendingShare.hasPrefix(kitchenShelfPendingSharePasteboardPrefix),
      let pendingShareURL = URL(string: pendingShare)
    else {
      return
    }

    deliverKitchenShelfPendingShare(pendingShareURL, remainingAttempts: 6)
    DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
      pendingSharePasteboard.string = ""
    }
  }

  private func deliverKitchenShelfPendingShare(_ pendingShareURL: URL, remainingAttempts: Int) {
    _ = RCTLinkingManager.application(UIApplication.shared, open: pendingShareURL, options: [:])

    guard remainingAttempts > 1 else {
      return
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.75) { [weak self] in
      self?.deliverKitchenShelfPendingShare(pendingShareURL, remainingAttempts: remainingAttempts - 1)
    }
  }`;

  if (!nextContents.includes('handleKitchenShelfPendingSharePasteboardURL')) {
    nextContents = nextContents.replace(
      /  \/\/ Universal Links\n/,
      `  public override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    handleKitchenShelfPendingSharePasteboardURL(application)
  }

${pendingShareHandler}

  // Universal Links\n`
    );
  } else {
    nextContents = nextContents.replace(
      /  private func handleKitchenShelfPendingSharePasteboardURL\(_ application: UIApplication\) \{[\s\S]*?\n  \}\n\n  \/\/ Universal Links/,
      `${pendingShareHandler}\n\n  // Universal Links`
    );
  }

  return nextContents;
}

function renderPendingShareModule(appScheme, pasteboardName, appGroupIdentifier, pendingShareDefaultsKey) {
  return `#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <React/RCTBridgeModule.h>

@interface KitchenShelfPendingShare : NSObject <RCTBridgeModule>
@end

@implementation KitchenShelfPendingShare

RCT_EXPORT_MODULE();

RCT_REMAP_METHOD(consumePendingShare,
                 consumePendingShareWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *pendingSharePrefix = @"${appScheme}://share";
  NSString *appGroupIdentifier = @"${appGroupIdentifier}";
  NSString *pendingShareDefaultsKey = @"${pendingShareDefaultsKey}";
  NSString *pendingShareFileName = @"pending-share-url.txt";
  UIPasteboardName pendingSharePasteboardName = @"${pasteboardName}";

  NSUserDefaults *pendingShareDefaults = [[NSUserDefaults alloc] initWithSuiteName:appGroupIdentifier];
  NSString *storedPendingShare = [[pendingShareDefaults stringForKey:pendingShareDefaultsKey] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

  if (storedPendingShare.length > 0 && [storedPendingShare hasPrefix:pendingSharePrefix]) {
    [pendingShareDefaults removeObjectForKey:pendingShareDefaultsKey];
    resolve(storedPendingShare);
    return;
  }

  NSURL *appGroupURL = [[NSFileManager defaultManager] containerURLForSecurityApplicationGroupIdentifier:appGroupIdentifier];
  NSURL *pendingShareFileURL = [appGroupURL URLByAppendingPathComponent:pendingShareFileName];
  NSString *filePendingShare = [[NSString stringWithContentsOfURL:pendingShareFileURL encoding:NSUTF8StringEncoding error:nil] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

  if (filePendingShare.length > 0 && [filePendingShare hasPrefix:pendingSharePrefix]) {
    [[NSFileManager defaultManager] removeItemAtURL:pendingShareFileURL error:nil];
    resolve(filePendingShare);
    return;
  }

  UIPasteboard *pendingSharePasteboard = [UIPasteboard pasteboardWithName:pendingSharePasteboardName create:NO];
  NSString *pasteboardPendingShare = [pendingSharePasteboard.string stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];

  if (pasteboardPendingShare.length > 0 && [pasteboardPendingShare hasPrefix:pendingSharePrefix]) {
    pendingSharePasteboard.string = @"";
    resolve(pasteboardPendingShare);
    return;
  }

  resolve([NSNull null]);
}

@end
`;
}

function renderAppGroupEntitlements(appGroupIdentifier) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.application-groups</key>
  <array>
    <string>${appGroupIdentifier}</string>
  </array>
</dict>
</plist>
`;
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
  const appRoot = path.join(iosRoot, 'KitchenShelf');
  fs.mkdirSync(extensionRoot, { recursive: true });
  fs.mkdirSync(appRoot, { recursive: true });

  writeFileIfChanged(
    path.join(extensionRoot, 'ShareViewController.swift'),
    renderShareViewController({
      appScheme: props.appScheme,
      appGroupIdentifier: props.appGroupIdentifier,
      pasteboardName: props.pasteboardName,
      pendingShareDefaultsKey: props.pendingShareDefaultsKey,
    })
  );
  writeFileIfChanged(
    path.join(extensionRoot, `${SHARE_EXTENSION_NAME}-Info.plist`),
    renderInfoPlist()
  );
  writeFileIfChanged(
    path.join(extensionRoot, `${SHARE_EXTENSION_NAME}.entitlements`),
    renderAppGroupEntitlements(props.appGroupIdentifier)
  );
  writeFileIfChanged(
    path.join(appRoot, 'KitchenShelf.entitlements'),
    renderAppGroupEntitlements(props.appGroupIdentifier)
  );
  writeFileIfChanged(
    path.join(appRoot, 'KitchenShelfPendingShare.m'),
    renderPendingShareModule(
      props.appScheme,
      props.pasteboardName,
      props.appGroupIdentifier,
      props.pendingShareDefaultsKey
    )
  );

  const appDelegatePath = path.join(iosRoot, 'KitchenShelf', 'AppDelegate.swift');
  if (fs.existsSync(appDelegatePath)) {
    writeFileIfChanged(
      appDelegatePath,
      patchAppDelegateForPendingShares(
        fs.readFileSync(appDelegatePath, 'utf8'),
        props.appScheme,
        props.pasteboardName,
        props.appGroupIdentifier,
        props.pendingShareDefaultsKey
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
    buildSettings.CODE_SIGN_ENTITLEMENTS = `"${SHARE_EXTENSION_NAME}/${SHARE_EXTENSION_NAME}.entitlements"`;
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
  addNativePendingShareModuleToAppTarget(project);

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

function addNativePendingShareModuleToAppTarget(project) {
  const appTargetUuid = project.getFirstTarget?.()?.uuid;
  if (!appTargetUuid) {
    return;
  }

  if (project.hasFile?.('KitchenShelf/KitchenShelfPendingShare.m')) {
    return;
  }

  const appGroupKey = project.findPBXGroupKey?.({ name: 'KitchenShelf' });
  project.addSourceFile('KitchenShelf/KitchenShelfPendingShare.m', { target: appTargetUuid }, appGroupKey);
}

function withIosShareIntoApp(config, options = {}) {
  const appScheme = options.appScheme ?? config.scheme;
  const extensionBundleIdentifier =
    options.extensionBundleIdentifier ?? `${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}.share`;
  const appGroupIdentifier =
    options.appGroupIdentifier ?? `group.${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}`;
  const pasteboardName =
    options.pasteboardName ?? `${config.ios?.bundleIdentifier ?? 'com.kitchenshelf.app'}.pending-share`;
  const pendingShareDefaultsKey = options.pendingShareDefaultsKey ?? 'pending-share-url';

  config = withDangerousMod(config, [
    'ios',
    (mod) => {
      writeShareExtensionFiles(mod.modRequest.platformProjectRoot, {
        appScheme,
        appGroupIdentifier,
        extensionBundleIdentifier,
        pasteboardName,
        pendingShareDefaultsKey,
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
