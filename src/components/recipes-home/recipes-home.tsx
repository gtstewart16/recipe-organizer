import { ImageBackground, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { InteractivePressable } from '../InteractivePressable';
import { SwipeToDeleteRow } from '../swipe-actions';

export type RecipesHomeProps = {
  groups: RecipeGroup[];
  favoriteGroupIds?: string[];
  recipes: RecipeRecord[];
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onGroupPress: (group: RecipeGroup) => void;
  onFavoriteGroupToggle?: (group: RecipeGroup) => void;
  onRecipeDelete?: (recipe: RecipeRecord) => void;
  onRecipePress: (recipe: RecipeRecord) => void;
};

export function RecipesHome({
  groups,
  favoriteGroupIds,
  recipes,
  searchQuery,
  onSearchQueryChange,
  onGroupPress,
  onFavoriteGroupToggle,
  onRecipeDelete,
  onRecipePress,
}: RecipesHomeProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.headerCopy}>
        <Text style={styles.sectionTitle}>Recipes</Text>
        <Text style={styles.sectionBody}>
          Start with a favorite collection, then browse the recipes you reach for most often.
        </Text>
      </View>

      <TextInput
        placeholder="Search recipes or groups"
        placeholderTextColor={colors.textSubtle}
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={onSearchQueryChange}
      />

      <FavoriteGroupsSection
        groups={groups}
        favoriteGroupIds={favoriteGroupIds}
        onGroupPress={onGroupPress}
        onFavoriteGroupToggle={onFavoriteGroupToggle}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Recent recipes</Text>
      </View>

      <View style={styles.recipeList}>
        {recipes.length > 0 ? (
          recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onDelete={onRecipeDelete}
              onPress={onRecipePress}
            />
          ))
        ) : (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateTitle}>No recipes yet</Text>
            <Text style={styles.emptyStateBody}>
              Save a recipe from a link or cookbook photo and it will show up here.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export type FavoriteGroupsSectionProps = {
  groups: RecipeGroup[];
  favoriteGroupIds?: string[];
  onGroupPress: (group: RecipeGroup) => void;
  onFavoriteGroupToggle?: (group: RecipeGroup) => void;
};

export function FavoriteGroupsSection({
  groups,
  favoriteGroupIds,
  onGroupPress,
  onFavoriteGroupToggle,
}: FavoriteGroupsSectionProps) {
  const favoriteGroupSet = new Set(favoriteGroupIds ?? []);
  const visibleGroups = favoriteGroupIds
    ? groups.filter((group) => favoriteGroupSet.has(group.id))
    : groups.filter((group) => group.isFavorite);

  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>Favorite groups</Text>
      </View>

      {visibleGroups.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupRow}>
          {visibleGroups.map((group) => {
            const isFavorite = favoriteGroupSet.has(group.id);

            return (
              <View
                key={group.id}
                style={[styles.groupCardShell, isFavorite && styles.groupCardShellFavorite]}
                testID={`favorite-group-tile-${group.id}`}
              >
                <InteractivePressable style={styles.groupCard} onPress={() => onGroupPress(group)}>
                  <View style={[styles.groupCardAccent, isFavorite && styles.groupCardAccentFavorite]} />
                  <View style={styles.groupCardBody}>
                    <Text style={styles.groupCardTitle} numberOfLines={2}>
                      {group.name}
                    </Text>
                    <Text style={styles.groupCardBodyText}>Open collection</Text>
                  </View>
                </InteractivePressable>

                <InteractivePressable
                  style={styles.groupStarButton}
                  onPress={() => onFavoriteGroupToggle?.(group)}
                  accessibilityLabel={isFavorite ? `Remove ${group.name} from favorites` : `Favorite ${group.name}`}
                  testID={`favorite-group-star-${group.id}`}
                >
                  <Text style={styles.groupStarIcon}>{isFavorite ? '★' : '☆'}</Text>
                </InteractivePressable>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>No favorite groups yet</Text>
          <Text style={styles.emptyStateBody}>Tap the star on a group to pin it here for quicker browsing.</Text>
        </View>
      )}
    </View>
  );
}

export type RecipeCardProps = {
  recipe: RecipeRecord;
  onDelete?: (recipe: RecipeRecord) => void;
  onPress: (recipe: RecipeRecord) => void;
};

export function RecipeCard({ recipe, onDelete, onPress }: RecipeCardProps) {
  const servingsLabel = recipe.servings ? `${recipe.servings} servings` : 'Review-ready recipe';
  const snippet = recipe.instructions[0] ?? 'Ready to save into a favorite group.';
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
  screen: {
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
  },
  sectionBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.accent,
  },
  groupRow: {
    gap: spacing.sm,
    paddingRight: spacing.xs,
  },
  groupCardShell: {
    position: 'relative',
    minHeight: 84,
    minWidth: 138,
  },
  groupCardShellFavorite: {
    opacity: 1,
  },
  groupCard: {
    ...shadows.card,
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 84,
    width: '100%',
    overflow: 'hidden',
  },
  groupCardAccent: {
    backgroundColor: colors.accentSoft,
    width: 7,
  },
  groupCardAccentFavorite: {
    backgroundColor: colors.accent,
  },
  groupCardBody: {
    flex: 1,
    gap: spacing.xxs,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  groupCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 18,
  },
  groupCardBodyText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  groupStarButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,249,0.96)',
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xxs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 6,
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
  },
  groupStarIcon: {
    color: colors.accentPressed,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 16,
  },
  recipeList: {
    gap: spacing.md,
  },
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
  emptyStateCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 6,
    padding: spacing.lg,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyStateBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
