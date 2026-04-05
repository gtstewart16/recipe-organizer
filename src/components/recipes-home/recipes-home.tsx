import { ImageBackground, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';
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
        placeholderTextColor="#8a7866"
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
            colors={['#f4e3d2', '#e7c8ab', '#f3e7dc']}
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
    gap: 16,
  },
  headerCopy: {
    gap: 8,
  },
  sectionTitle: {
    color: '#241711',
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 34,
  },
  sectionBody: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  searchInput: {
    backgroundColor: '#fffaf5',
    borderColor: '#e6d5c5',
    borderRadius: 18,
    borderWidth: 1,
    color: '#241711',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sectionBlock: {
    gap: 12,
  },
  sectionHeader: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    color: '#8a5b3f',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  groupRow: {
    gap: 12,
    paddingRight: 8,
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
    backgroundColor: '#fff7ef',
    borderColor: '#ead5c2',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 84,
    width: '100%',
    overflow: 'hidden',
  },
  groupCardAccent: {
    backgroundColor: '#d9a06f',
    width: 7,
  },
  groupCardAccentFavorite: {
    backgroundColor: '#be7c46',
  },
  groupCardBody: {
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  groupCardTitle: {
    color: '#241711',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  groupCardBodyText: {
    color: '#6d5647',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  groupStarButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,248,241,0.96)',
    borderColor: '#ead5c2',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    position: 'absolute',
    right: 8,
    top: 8,
  },
  groupStarIcon: {
    color: '#8a5b3f',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  recipeList: {
    gap: 14,
  },
  recipeCard: {
    backgroundColor: '#fffaf5',
    borderColor: '#e7d7c8',
    borderRadius: 28,
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  recipeHeroOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  recipeHeroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,250,245,0.92)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recipeHeroBadgeLabel: {
    color: '#6d5647',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  recipeHeroFallback: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  recipeHeroFallbackInner: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,250,245,0.72)',
    borderRadius: 20,
    gap: 6,
    maxWidth: '82%',
    padding: 16,
  },
  recipeHeroFallbackLabel: {
    color: '#6e291f',
    fontSize: 16,
    fontWeight: '700',
  },
  recipeHeroFallbackBody: {
    color: '#5d4b3d',
    fontSize: 13,
    lineHeight: 18,
  },
  recipeCardBody: {
    gap: 8,
    padding: 16,
  },
  recipeCardTitle: {
    color: '#241711',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
  },
  recipeCardMeta: {
    color: '#8a5b3f',
    fontSize: 14,
    fontWeight: '600',
  },
  recipeCardSnippet: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  emptyStateCard: {
    backgroundColor: '#fff8f1',
    borderColor: '#ead8c7',
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  emptyStateTitle: {
    color: '#241711',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyStateBody: {
    color: '#5d4b3d',
    fontSize: 14,
    lineHeight: 20,
  },
});
