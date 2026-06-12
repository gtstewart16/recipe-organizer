import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';
import { colors, radius, spacing, type } from '../../theme';
import { FavoriteGroupsSection } from './favorite-groups-section';
import { RecipeCard } from './recipe-card';
export { FavoriteGroupsSection } from './favorite-groups-section';
export type { FavoriteGroupsSectionProps } from './favorite-groups-section';
export { RecipeCard } from './recipe-card';
export type { RecipeCardProps } from './recipe-card';

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
  const trimmedSearchQuery = searchQuery.trim();
  const hasSearchQuery = trimmedSearchQuery.length > 0;

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
            <Text style={styles.emptyStateTitle}>
              {hasSearchQuery ? `No matches for "${trimmedSearchQuery}"` : 'No recipes yet'}
            </Text>
            <Text style={styles.emptyStateBody}>
              {hasSearchQuery
                ? 'Try another search or clear the shelf to see everything again.'
                : 'Save a recipe from a link or cookbook photo and it will show up here.'}
            </Text>
          </View>
        )}
      </View>
    </View>
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
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    ...type.eyebrow,
    color: colors.accent,
  },
  recipeList: {
    gap: spacing.md,
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
