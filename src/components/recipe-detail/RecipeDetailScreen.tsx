import { useContext } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { InteractivePressable } from '../InteractivePressable';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { RecipeDirectionsSection } from './RecipeDirectionsSection';
import { RecipeIngredientsSection } from './RecipeIngredientsSection';

export type RecipeDetailRecipe = {
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
};

export function RecipeDetailScreen({
  recipe,
  groupNames = [],
  onClose,
  onEdit,
  onDelete,
  onOpenSource,
}: RecipeDetailScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const safeTopInset = insets.top > 0 ? insets.top : 44;
  const closeOffsetTop = safeTopInset + 14;
  const metadataItems = [
    { label: 'Servings', value: recipe.servings ?? '—' },
    { label: 'Prep', value: recipe.prepTime ?? '—' },
    { label: 'Cook', value: recipe.cookTime ?? '—' },
  ];

  return (
    <View style={styles.screen} testID="recipe-detail-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroShell}>
          {recipe.heroImageUri ? (
            <ImageBackground
              testID="recipe-detail-hero-image"
              source={{ uri: recipe.heroImageUri }}
              imageStyle={styles.heroImage}
              style={styles.hero}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>{recipe.title}</Text>
              </View>
            </ImageBackground>
          ) : (
            <View testID="recipe-detail-hero-fallback" style={styles.heroFallback}>
              <Text style={styles.heroTitle}>{recipe.title}</Text>
            </View>
          )}

          <View style={[styles.heroChrome, { top: closeOffsetTop }]} testID="recipe-detail-close-chrome">
            <InteractivePressable
              testID="recipe-detail-close-button"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonLabel}>×</Text>
            </InteractivePressable>
          </View>
        </View>

        <View style={styles.body}>
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
            <InteractivePressable accessibilityRole="button" onPress={onOpenSource} style={styles.sourceButton}>
              <Text style={styles.sourceLink}>Open original recipe</Text>
            </InteractivePressable>
          ) : null}

          <RecipeIngredientsSection ingredients={recipe.ingredients} />
          <RecipeDirectionsSection instructions={recipe.instructions} />
        </View>
      </ScrollView>
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
  sourceLink: {
    color: colors.accentPressed,
    fontSize: 15,
    fontWeight: '800',
  },
});
