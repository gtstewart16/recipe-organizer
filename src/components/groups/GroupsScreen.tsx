import type React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, type RefreshControlProps } from 'react-native';

import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';
import { colors, radius, shadows, spacing, type } from '../../theme';
import { InteractivePressable } from '../InteractivePressable';
import { SwipeToDeleteRow } from '../swipe-actions';

export type GroupsScreenProps = {
  groups: RecipeGroup[];
  orderedGroups: RecipeGroup[];
  selectedGroup: RecipeGroup | null;
  recipesForSelectedGroup: RecipeRecord[];
  newGroupName: string;
  renameGroupName: string;
  syncError: string | null;
  isRefreshing: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  groupedRecipeCount: (groupId: string) => number;
  onNewGroupNameChange: (value: string) => void;
  onRenameGroupNameChange: (value: string) => void;
  onCreateGroup: () => void;
  onRenameGroup: () => void;
  onSelectGroup: (groupId: string) => void;
  onToggleGroupFavorite: (group: RecipeGroup) => void;
  onDeleteGroup: (group: RecipeGroup) => void;
  onRecipePress: (recipeId: string) => void;
  onRecipeDelete: (recipe: RecipeRecord) => void;
};

export function GroupsScreen({
  groups,
  orderedGroups,
  selectedGroup,
  recipesForSelectedGroup,
  newGroupName,
  renameGroupName,
  syncError,
  refreshControl,
  groupedRecipeCount,
  onNewGroupNameChange,
  onRenameGroupNameChange,
  onCreateGroup,
  onRenameGroup,
  onSelectGroup,
  onToggleGroupFavorite,
  onDeleteGroup,
  onRecipePress,
  onRecipeDelete,
}: GroupsScreenProps) {
  return (
    <ScrollView
      testID="groups-scroll-view"
      contentContainerStyle={styles.screenContent}
      refreshControl={refreshControl}
    >
      <View style={styles.headerCopy}>
        <Text style={styles.sectionTitle}>Groups</Text>
        <Text style={styles.sectionBody}>Keep weeknight staples, cookbook projects, and favorites easy to reach.</Text>
      </View>

      <View style={styles.inlineComposer}>
        <TextInput
          placeholder="Create a group"
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, styles.inlineInput]}
          value={newGroupName}
          onChangeText={onNewGroupNameChange}
        />
        <InteractivePressable style={styles.secondaryButton} onPress={onCreateGroup}>
          <Text style={styles.secondaryButtonLabel}>Add</Text>
        </InteractivePressable>
      </View>
      {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}

      <View style={styles.groupList}>
        {orderedGroups.map((group) => (
          <SwipeToDeleteRow
            key={group.id}
            actionLabel="Delete group"
            actionTestID={`group-delete-${group.id}`}
            contentTestID={`group-content-${group.id}`}
            onAction={() => onDeleteGroup(group)}
          >
            <View style={[styles.groupRow, selectedGroup?.id === group.id ? styles.groupRowSelected : undefined]}>
              <InteractivePressable style={styles.groupRowMain} onPress={() => onSelectGroup(group.id)}>
                <View>
                  <Text style={styles.groupRowTitle}>{group.name}</Text>
                  <Text style={styles.groupRowMeta}>{groupedRecipeCount(group.id)} recipes</Text>
                </View>
              </InteractivePressable>
              <View style={styles.groupRowActions}>
                <InteractivePressable
                  style={[styles.groupFavoriteButton, group.isFavorite ? styles.groupFavoriteButtonActive : undefined]}
                  onPress={() => onToggleGroupFavorite(group)}
                  accessibilityLabel={group.isFavorite ? `Remove ${group.name} from favorites` : `Favorite ${group.name}`}
                  hitSlop={8}
                  testID={`groups-favorite-button-${group.id}`}
                >
                  <Text
                    style={[
                      styles.groupFavoriteButtonLabel,
                      group.isFavorite ? styles.groupFavoriteButtonLabelActive : undefined,
                    ]}
                  >
                    {group.isFavorite ? '★' : '☆'}
                  </Text>
                </InteractivePressable>
              </View>
            </View>
          </SwipeToDeleteRow>
        ))}
      </View>

      {selectedGroup ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>{selectedGroup.name}</Text>
          <View style={styles.inlineComposer}>
            <TextInput
              placeholder="Rename group"
              placeholderTextColor={colors.textSubtle}
              style={[styles.input, styles.inlineInput]}
              value={renameGroupName}
              onChangeText={onRenameGroupNameChange}
            />
            <InteractivePressable style={styles.secondaryButton} onPress={onRenameGroup}>
              <Text style={styles.secondaryButtonLabel}>Rename</Text>
            </InteractivePressable>
          </View>
          {recipesForSelectedGroup.map((recipe) => (
            <SwipeToDeleteRow
              key={recipe.id}
              actionLabel="Delete recipe"
              actionTestID={`group-recipe-delete-${recipe.id}`}
              contentTestID={`group-recipe-content-${recipe.id}`}
              onAction={() => onRecipeDelete(recipe)}
            >
              <InteractivePressable style={styles.groupRecipeCard} onPress={() => onRecipePress(recipe.id)}>
                <Text style={styles.groupRecipeTitle}>{recipe.title}</Text>
                <Text style={styles.groupRecipeMeta}>{recipe.instructions[0]}</Text>
              </InteractivePressable>
            </SwipeToDeleteRow>
          ))}
        </View>
      ) : groups.length > 0 ? (
        <View style={styles.emptyStateCard}>
          <Text style={styles.emptyStateTitle}>Choose a group</Text>
          <Text style={styles.emptyStateBody}>Select a collection to rename it or browse its recipes.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...type.sectionTitle,
    color: colors.text,
  },
  sectionBody: {
    ...type.body,
    color: colors.textMuted,
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
  inlineComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  inlineInput: {
    flex: 1,
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
  groupList: {
    gap: spacing.xs,
  },
  groupRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  groupRowSelected: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.accentSoft,
  },
  groupRowMain: {
    flex: 1,
  },
  groupRowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  groupRowTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  groupRowMeta: {
    color: colors.textSubtle,
    fontSize: 14,
  },
  groupFavoriteButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  groupFavoriteButtonActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  groupFavoriteButtonLabel: {
    color: colors.accentPressed,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  groupFavoriteButtonLabelActive: {
    color: colors.accentPressed,
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
  groupRecipeCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.xxs,
    padding: spacing.md,
  },
  groupRecipeTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  groupRecipeMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyStateCard: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.lg,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  emptyStateBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
