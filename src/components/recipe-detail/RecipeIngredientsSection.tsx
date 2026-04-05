import { StyleSheet, Text, View } from 'react-native';

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
    gap: 14,
  },
  sectionTitle: {
    color: '#8a5b3f',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  list: {
    gap: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  bullet: {
    backgroundColor: '#d9b49d',
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    width: 8,
  },
  item: {
    color: '#3b2d24',
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
});
