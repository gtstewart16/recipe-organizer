import type React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type RefreshControlProps } from 'react-native';

import {
  getImportFallbackGuidance,
  getImportFeedbackTitle,
  getImportRetryLabel,
  type ImportFeedbackSourceType,
} from '../../lib/import-feedback';
import { parseMultilineList } from '../../lib/recipe-text';
import type { RecipeDraft, RecipeGroup } from '../../store/recipe-book';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { ImportFeedbackCard } from '../ImportFeedbackCard';
import { InteractivePressable } from '../InteractivePressable';
import { SharedImportQueue, type SharedImportQueueProps } from '../SharedImportQueue';
import { ImportHistorySection, type ImportHistorySectionProps } from '../import-history';

export type EditableReviewDraft = RecipeDraft & {
  selectedGroupIds: string[];
};

export type AddRecipeScreenProps = {
  groups: RecipeGroup[];
  reviewDraft: EditableReviewDraft | null;
  urlInput: string;
  importError: string | null;
  lastImportSourceType: ImportFeedbackSourceType | null;
  isImportingUrl: boolean;
  isImportingPhoto: boolean;
  sharedImportQueue?: SharedImportQueueProps;
  importHistory?: ImportHistorySectionProps;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  onUrlInputChange: (value: string) => void;
  onBeginUrlReview: () => void;
  onBeginPhotoReview: (mode: 'camera' | 'library') => void;
  onRetryImport: () => void;
  onDismissImportError: () => void;
  onReviewDraftChange: (draft: EditableReviewDraft) => void;
  onBackToImport: () => void;
  onDiscardDraft: () => void;
  onSaveRecipe: () => void;
};

export function AddRecipeScreen({
  groups,
  reviewDraft,
  urlInput,
  importError,
  lastImportSourceType,
  isImportingUrl,
  isImportingPhoto,
  sharedImportQueue,
  importHistory,
  refreshControl,
  onUrlInputChange,
  onBeginUrlReview,
  onBeginPhotoReview,
  onRetryImport,
  onDismissImportError,
  onReviewDraftChange,
  onBackToImport,
  onDiscardDraft,
  onSaveRecipe,
}: AddRecipeScreenProps) {
  return (
    <ScrollView
      testID="add-scroll-view"
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      <Text style={styles.sectionTitle}>Add</Text>
      {!reviewDraft ? (
        <>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>From link</Text>
            <Text style={styles.panelBody}>Paste a recipe URL and turn it into a review draft before saving.</Text>
            <TextInput
              autoCapitalize="none"
              placeholder="https://example.com/cacio-e-pepe"
              placeholderTextColor={colors.textSubtle}
              style={styles.input}
              value={urlInput}
              onChangeText={onUrlInputChange}
            />
            {importError && lastImportSourceType === 'url' ? (
              <ImportFeedbackCard
                title={getImportFeedbackTitle('url')}
                message={importError}
                guidance={getImportFallbackGuidance('url')}
                primaryAction={{ label: getImportRetryLabel('url'), onPress: onRetryImport }}
                secondaryAction={{ label: 'Dismiss', onPress: onDismissImportError }}
              />
            ) : null}
            <InteractivePressable style={styles.primaryButton} onPress={onBeginUrlReview}>
              <Text style={styles.primaryButtonLabel}>
                {isImportingUrl ? 'Importing recipe…' : 'Create review draft'}
              </Text>
            </InteractivePressable>
          </View>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>From photo</Text>
            <Text style={styles.panelBody}>Capture cookbook pages or import them from your library.</Text>
            <View style={styles.actionRow}>
              <InteractivePressable style={styles.secondaryButton} onPress={() => onBeginPhotoReview('camera')}>
                <Text style={styles.secondaryButtonLabel}>
                  {isImportingPhoto ? 'Importing photo…' : 'Use camera'}
                </Text>
              </InteractivePressable>
              <InteractivePressable style={styles.secondaryButton} onPress={() => onBeginPhotoReview('library')}>
                <Text style={styles.secondaryButtonLabel}>
                  {isImportingPhoto ? 'Importing photo…' : 'Photo library'}
                </Text>
              </InteractivePressable>
            </View>
            {importError && lastImportSourceType === 'photo' ? (
              <ImportFeedbackCard
                title={getImportFeedbackTitle('photo')}
                message={importError}
                guidance={getImportFallbackGuidance('photo')}
                primaryAction={{ label: getImportRetryLabel('photo'), onPress: onRetryImport }}
                secondaryAction={{ label: 'Dismiss', onPress: onDismissImportError }}
              />
            ) : null}
          </View>
          {importError && !lastImportSourceType ? <Text style={styles.errorText}>{importError}</Text> : null}
          {sharedImportQueue ? <SharedImportQueue {...sharedImportQueue} /> : null}
          {importHistory ? <ImportHistorySection {...importHistory} /> : null}
        </>
      ) : (
        <View style={styles.panel}>
          <InteractivePressable style={styles.inlineBackButton} onPress={onBackToImport}>
            <Text style={styles.inlineBackButtonLabel}>Back to import</Text>
          </InteractivePressable>
          <Text style={styles.panelTitle}>Review import</Text>
          <Text style={styles.panelBody}>
            Edit anything the parser missed, choose a group, then confirm the recipe to save it into your shared library.
          </Text>
          <TextInput
            style={styles.input}
            value={reviewDraft.title}
            onChangeText={(value) => onReviewDraftChange({ ...reviewDraft, title: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Optional description"
            placeholderTextColor={colors.textSubtle}
            value={reviewDraft.description ?? ''}
            onChangeText={(value) => onReviewDraftChange({ ...reviewDraft, description: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Servings"
            placeholderTextColor={colors.textSubtle}
            value={reviewDraft.servings ?? ''}
            onChangeText={(value) => onReviewDraftChange({ ...reviewDraft, servings: value })}
          />
          <View style={styles.inlineComposer}>
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="Prep time"
              placeholderTextColor={colors.textSubtle}
              value={reviewDraft.prepTime ?? ''}
              onChangeText={(value) => onReviewDraftChange({ ...reviewDraft, prepTime: value })}
            />
            <TextInput
              style={[styles.input, styles.inlineInput]}
              placeholder="Cook time"
              placeholderTextColor={colors.textSubtle}
              value={reviewDraft.cookTime ?? ''}
              onChangeText={(value) => onReviewDraftChange({ ...reviewDraft, cookTime: value })}
            />
          </View>
          <EditableListField
            label="Ingredients"
            lines={reviewDraft.ingredients}
            onChange={(lines) => onReviewDraftChange({ ...reviewDraft, ingredients: lines })}
          />
          <EditableListField
            label="Directions"
            lines={reviewDraft.instructions}
            onChange={(lines) => onReviewDraftChange({ ...reviewDraft, instructions: lines })}
          />

          <Text style={styles.sectionLabel}>Save to groups</Text>
          <View style={styles.groupSelectionGrid}>
            {groups.map((group) => {
              const selected = reviewDraft.selectedGroupIds.includes(group.id);

              return (
                <InteractivePressable
                  key={group.id}
                  style={[styles.groupSelectChip, selected ? styles.groupSelectChipActive : null]}
                  onPress={() =>
                    onReviewDraftChange({
                      ...reviewDraft,
                      selectedGroupIds: selected
                        ? reviewDraft.selectedGroupIds.filter((groupId) => groupId !== group.id)
                        : [...reviewDraft.selectedGroupIds, group.id],
                    })
                  }
                >
                  <Text style={[styles.groupSelectChipLabel, selected ? styles.groupSelectChipLabelActive : null]}>
                    {group.name}
                  </Text>
                </InteractivePressable>
              );
            })}
          </View>
          {importError ? <Text style={styles.errorText}>{importError}</Text> : null}

          <View style={styles.actionRow}>
            <InteractivePressable style={styles.secondaryButton} onPress={onDiscardDraft}>
              <Text style={styles.secondaryButtonLabel}>Discard draft</Text>
            </InteractivePressable>
            <InteractivePressable style={styles.primaryButtonCompact} onPress={onSaveRecipe}>
              <Text style={styles.primaryButtonLabel}>Confirm recipe</Text>
            </InteractivePressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function EditableListField({
  label,
  lines,
  onChange,
}: {
  label: string;
  lines: string[];
  onChange: (lines: string[]) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        multiline
        style={[styles.input, styles.multilineInput]}
        value={lines.join('\n')}
        onChangeText={(value) => onChange(parseMultilineList(value))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.accent,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inlineComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  primaryButtonCompact: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: 15,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  panelBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  groupSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  groupSelectChip: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  groupSelectChipActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  groupSelectChipLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  groupSelectChipLabelActive: {
    color: colors.white,
  },
  inlineBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  inlineBackButtonLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
});
