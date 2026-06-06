import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, type } from '../../theme';

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
    gap: spacing.lg,
  },
  stepRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stepBadge: {
    alignItems: 'center',
    backgroundColor: colors.accentSoft,
    borderColor: colors.borderStrong,
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    marginTop: 1,
    width: 32,
  },
  stepBadgeLabel: {
    color: colors.accentPressed,
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    lineHeight: 28,
  },
});
