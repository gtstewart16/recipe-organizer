import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { RecipeRecord } from '../../store/recipe-book';
import { colors, radius, shadows, spacing } from '../../theme';
import { InteractivePressable } from '../InteractivePressable';
import { SwipeToDeleteRow } from '../swipe-actions';
import { formatRecipeServingsLabel, getRecipeSnippet } from './recipe-card-text';

export type RecipeCardProps = {
  readonly recipe: RecipeRecord;
  readonly onDelete?: (recipe: RecipeRecord) => void;
  readonly onPress: (recipe: RecipeRecord) => void;
};

export function RecipeCard({ recipe, onDelete, onPress }: RecipeCardProps) {
  const servingsLabel = formatRecipeServingsLabel(recipe.servings);
  const snippet = getRecipeSnippet(recipe.instructions);
  const card = (
    <InteractivePressable style={styles.recipeCard} onPress={() => onPress(recipe)}>
      <View style={styles.recipeHero}>
        {recipe.heroImageUri ? (
          <ImageBackground
            source={{ uri: recipe.heroImageUri }}
            style={styles.recipeHeroImage}
            imageStyle={styles.recipeHeroImageStyle}
          >
            <LinearGradient colors={['rgba(36,23,17,0.04)', 'rgba(36,23,17,0.56)']} style={styles.recipeHeroOverlay}>
              <View style={styles.recipeHeroBadge}>
                <Text style={styles.recipeHeroBadgeLabel}>{servingsLabel}</Text>
              </View>
            </LinearGradient>
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={[colors.surfaceWarm, colors.accentSoft, colors.surfaceMuted]}
            style={styles.recipeHeroFallback}
            testID="recipe-card-fallback"
          >
            <View style={styles.recipeHeroFallbackInner}>
              <Text style={styles.recipeHeroFallbackLabel}>No image yet</Text>
              <Text style={styles.recipeHeroFallbackBody}>A warm placeholder until the next import brings a photo.</Text>
            </View>
          </LinearGradient>
        )}
      </View>

      <View style={styles.recipeCardBody}>
        <Text style={styles.recipeCardTitle}>{recipe.title}</Text>
        <Text style={styles.recipeCardMeta}>{servingsLabel}</Text>
        <Text style={styles.recipeCardSnippet} numberOfLines={2}>
          {snippet}
        </Text>
      </View>
    </InteractivePressable>
  );

  if (!onDelete) {
    return card;
  }

  return (
    <SwipeToDeleteRow
      actionLabel="Delete recipe"
      actionTestID={`recipe-card-delete-${recipe.id}`}
      contentTestID={`recipe-card-content-${recipe.id}`}
      onAction={() => onDelete(recipe)}
    >
      {card}
    </SwipeToDeleteRow>
  );
}

const styles = StyleSheet.create({
  recipeCard: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recipeHero: {
    height: 180,
    width: '100%',
  },
  recipeHeroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  recipeHeroImageStyle: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  recipeHeroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: spacing.md,
  },
  recipeHeroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,253,249,0.92)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  recipeHeroBadgeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recipeHeroFallback: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  recipeHeroFallbackInner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,253,249,0.76)',
    borderColor: 'rgba(216,198,182,0.72)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 6,
    maxWidth: '82%',
    padding: spacing.md,
  },
  recipeHeroFallbackLabel: {
    color: colors.accentPressed,
    fontSize: 16,
    fontWeight: '800',
  },
  recipeHeroFallbackBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  recipeCardBody: {
    gap: spacing.xs,
    padding: spacing.md,
  },
  recipeCardTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  recipeCardMeta: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  recipeCardSnippet: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
