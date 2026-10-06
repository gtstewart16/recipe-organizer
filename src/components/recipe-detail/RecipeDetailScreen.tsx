import { useContext, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, ImageBackground, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { InteractivePressable } from '../InteractivePressable';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { formatRecipeDuration } from '../../lib/duration';
import { RecipeDirectionsSection } from './RecipeDirectionsSection';
import { RecipeIngredientsSection } from './RecipeIngredientsSection';
import { RecipeServingControl } from './RecipeServingControl';
import { parseServings, scaleIngredient } from '../../lib/serving-scaling';

export type RecipeDetailRecipe = {
  id?: string;
  title: string;
  description?: string;
  heroImageUri?: string;
  sourceUrl?: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: string[];
  instructions: string[];
};

export type RecipeDetailScreenProps = {
  recipe: RecipeDetailRecipe;
  groupNames?: string[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSource?: () => void;
  onReplacePhoto: () => void;
  isReplacingPhoto?: boolean;
};

export function RecipeDetailScreen({
  recipe,
  groupNames = [],
  onClose,
  onEdit,
  onDelete,
  onOpenSource,
  onReplacePhoto,
  isReplacingPhoto = false,
}: RecipeDetailScreenProps) {
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const baseServings = parseServings(recipe.servings);
  const scalingKey = JSON.stringify([recipe.id, recipe.title, recipe.servings, recipe.ingredients]);
  const [selection, setSelection] = useState<{ key: string; count: number } | null>(null);
  if (selection !== null && selection.key !== scalingKey) setSelection(null);
  const servingCount = selection?.key === scalingKey ? selection.count : baseServings;
  const factor = servingCount !== null && baseServings !== null ? servingCount / baseServings : 1;
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const safeTopInset = insets.top > 0 ? insets.top : 44;
  const closeOffsetTop = safeTopInset + 14;
  const metadataItems = [
    { label: 'Prep', value: formatRecipeDuration(recipe.prepTime) ?? '—' },
    { label: 'Cook', value: formatRecipeDuration(recipe.cookTime) ?? '—' },
  ];
  const sourceHost = recipe.sourceUrl ? formatSourceHost(recipe.sourceUrl) : null;

  return (
    <View style={styles.screen} testID="recipe-detail-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroShell}>
          {recipe.heroImageUri ? (
            <InteractivePressable
              accessibilityHint="Opens the full photo and photo replacement options"
              accessibilityLabel="View recipe photo"
              onPress={() => setIsPhotoOpen(true)}
              style={styles.hero}
            >
              <ImageBackground
                testID="recipe-detail-hero-image"
                source={{ uri: recipe.heroImageUri }}
                imageStyle={styles.heroImage}
                style={styles.heroImageBackground}
              >
                <View style={styles.heroOverlay} />
                <View style={styles.heroTextWrap}>
                  <Text style={styles.heroTitle}>{recipe.title}</Text>
                  <Text style={styles.photoHint}>Tap to view photo</Text>
                </View>
              </ImageBackground>
            </InteractivePressable>
          ) : (
            <View testID="recipe-detail-hero-fallback" style={styles.heroFallback}>
              <Text style={styles.heroTitle}>{recipe.title}</Text>
            </View>
          )}

          <View style={[styles.heroChrome, { top: closeOffsetTop }]} testID="recipe-detail-close-chrome">
            <InteractivePressable
              accessibilityLabel="Close recipe detail"
              accessibilityRole="button"
              testID="recipe-detail-close-button"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonLabel}>×</Text>
            </InteractivePressable>
          </View>
        </View>

        <View style={styles.body}>
          <RecipeServingControl
            original={recipe.servings}
            base={baseServings}
            count={servingCount}
            onChange={(count) => setSelection({ key: scalingKey, count })}
          />
          <View style={styles.metadataGrid}>
            {metadataItems.map((item) => (
              <View key={item.label} style={styles.metadataCard}>
                <Text style={styles.metadataCardLabel}>{item.label}</Text>
                <Text style={styles.metadataCardValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {groupNames.length > 0 ? (
            <View style={styles.groupsBlock}>
              <Text style={styles.sectionLabel}>Groups</Text>
              <View style={styles.groupChips}>
                {groupNames.map((groupName) => (
                  <View key={groupName} style={styles.groupChip}>
                    <Text style={styles.groupChipLabel}>{groupName}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}

          <View style={styles.actionsRow}>
            <InteractivePressable accessibilityRole="button" style={styles.secondaryButton} onPress={onEdit}>
              <Text style={styles.secondaryButtonLabel}>Edit recipe</Text>
            </InteractivePressable>
            <InteractivePressable
              accessibilityRole="button"
              style={styles.destructiveButton}
              onPress={onDelete}
              testID="recipe-detail-delete-button"
            >
              <Text style={styles.destructiveButtonLabel}>Delete recipe</Text>
            </InteractivePressable>
          </View>

          {recipe.sourceUrl && onOpenSource ? (
            <View style={styles.sourceBlock}>
              <Text style={styles.sectionLabel}>Source</Text>
              {sourceHost ? <Text style={styles.sourceHost}>{sourceHost}</Text> : null}
              <InteractivePressable accessibilityRole="button" onPress={onOpenSource} style={styles.sourceButton}>
                <Text style={styles.sourceLink}>Open original recipe</Text>
              </InteractivePressable>
            </View>
          ) : null}

          <RecipeIngredientsSection ingredients={recipe.ingredients.map((ingredient) => scaleIngredient(ingredient, factor))} />
          <RecipeDirectionsSection instructions={recipe.instructions} />
        </View>
      </ScrollView>

      {recipe.heroImageUri ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setIsPhotoOpen(false)}
          presentationStyle="fullScreen"
          visible={isPhotoOpen}
        >
          <View style={styles.photoViewer} testID="recipe-photo-viewer">
            {isPhotoOpen ? <StatusBar style="light" /> : null}
            <Image
              accessibilityLabel={`${recipe.title} full photo`}
              resizeMode="contain"
              source={{ uri: recipe.heroImageUri }}
              style={styles.fullPhoto}
            />
            <View style={[styles.photoViewerTop, { paddingTop: safeTopInset + spacing.sm }]}>
              <InteractivePressable
                accessibilityLabel="Close full photo"
                onPress={() => setIsPhotoOpen(false)}
                style={styles.viewerCloseButton}
              >
                <Text style={styles.viewerCloseLabel}>×</Text>
              </InteractivePressable>
            </View>
            <View style={[styles.photoViewerActions, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              <InteractivePressable
                accessibilityLabel="Replace recipe photo"
                disabled={isReplacingPhoto}
                onPress={onReplacePhoto}
                style={styles.replacePhotoButton}
              >
                <Text style={styles.replacePhotoLabel}>
                  {isReplacingPhoto ? 'Opening photo library…' : 'Replace photo'}
                </Text>
              </InteractivePressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xxl + spacing.lg,
  },
  heroShell: {
    position: 'relative',
  },
  hero: {
    backgroundColor: colors.surfaceMuted,
    height: 380,
  },
  heroImageBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(33, 28, 24, 0.36)',
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
  },
  heroTextWrap: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  heroFallback: {
    backgroundColor: colors.surfaceMuted,
    borderBottomLeftRadius: radius.xxl,
    borderBottomRightRadius: radius.xxl,
    justifyContent: 'flex-end',
    minHeight: 320,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  heroChrome: {
    left: spacing.lg,
    position: 'absolute',
    zIndex: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.96)',
    borderColor: 'rgba(231, 217, 203, 0.92)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
    ...shadows.card,
  },
  closeButtonLabel: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
    marginTop: -2,
  },
  heroTitle: {
    color: colors.white,
    ...type.title,
    textShadowColor: 'rgba(33, 28, 24, 0.32)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 12,
  },
  photoHint: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    opacity: 0.9,
  },
  photoViewer: {
    backgroundColor: colors.text,
    flex: 1,
    justifyContent: 'center',
  },
  fullPhoto: {
    ...StyleSheet.absoluteFillObject,
    height: undefined,
    width: undefined,
  },
  photoViewerTop: {
    left: spacing.lg,
    position: 'absolute',
    top: 0,
  },
  viewerCloseButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 253, 249, 0.94)',
    borderRadius: radius.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  viewerCloseLabel: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 30,
    marginTop: -2,
  },
  photoViewerActions: {
    bottom: 0,
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
  },
  replacePhotoButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  replacePhotoLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  body: {
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  description: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 26,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metadataCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 78,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    ...shadows.card,
  },
  metadataCardLabel: {
    color: colors.accent,
    ...type.eyebrow,
  },
  metadataCardValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  groupsBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.accent,
    ...type.eyebrow,
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  groupChip: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  groupChipLabel: {
    color: colors.accentPressed,
    fontSize: 13,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryButtonLabel: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  destructiveButton: {
    alignItems: 'center',
    backgroundColor: colors.dangerSoft,
    borderColor: 'rgba(179, 63, 47, 0.2)',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  destructiveButtonLabel: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  sourceButton: {
    alignSelf: 'flex-start',
    borderBottomColor: colors.accent,
    borderBottomWidth: 1,
    paddingBottom: spacing.xxs,
  },
  sourceBlock: {
    gap: spacing.xs,
  },
  sourceHost: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  sourceLink: {
    color: colors.accentPressed,
    fontSize: 15,
    fontWeight: '800',
  },
});

function formatSourceHost(sourceUrl: string) {
  try {
    return new URL(sourceUrl).host.replace(/^www\./, '');
  } catch {
    return sourceUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  }
}
