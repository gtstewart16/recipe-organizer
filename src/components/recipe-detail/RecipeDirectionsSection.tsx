import { StyleSheet, Text, View } from 'react-native';

export type RecipeDirectionsSectionProps = {
  instructions: string[];
  title?: string;
};

export function RecipeDirectionsSection({ instructions, title = 'Directions' }: RecipeDirectionsSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {instructions.map((instruction, index) => (
          <View key={`${instruction}-${index}`} style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeLabel}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{instruction}</Text>
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
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: '#efe1d3',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    marginTop: 1,
    width: 28,
  },
  stepBadgeLabel: {
    color: '#6e4b34',
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    color: '#3b2d24',
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
});
