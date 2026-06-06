import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../../theme';

export type RecipeIngredientsSectionProps = {
  ingredients: string[];
  title?: string;
};

export function RecipeIngredientsSection({ ingredients, title = 'Ingredients' }: RecipeIngredientsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {ingredients.map((ingredient, index) => (
          <View key={`${ingredient}-${index}`} style={styles.row}>
            <View style={styles.bullet} />
            <Text style={styles.item}>{ingredient}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  sectionTitle: {
    color: colors.accent,
    ...type.eyebrow,
  },
  list: {
    gap: spacing.md,
  },
  row: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bullet: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    height: 9,
    marginTop: 10,
    width: 9,
  },
  item: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 28,
  },
});
