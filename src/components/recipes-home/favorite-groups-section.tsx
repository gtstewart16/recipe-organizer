import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { RecipeGroup } from '../../store/recipe-book';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { InteractivePressable } from '../InteractivePressable';

export type FavoriteGroupsSectionProps = {
  readonly groups: RecipeGroup[];
  readonly favoriteGroupIds?: string[];
  readonly onGroupPress: (group: RecipeGroup) => void;
  readonly onFavoriteGroupToggle?: (group: RecipeGroup) => void;
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

const styles = StyleSheet.create({
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
