import { StyleSheet, Text, View } from 'react-native';
import { InteractivePressable } from '../InteractivePressable';
import { colors, radius, spacing, type } from '../../theme';
import { MAX_SERVINGS } from '../../lib/serving-scaling';

type Props = {
  original?: string;
  base: number | null;
  count: number | null;
  onChange: (count: number) => void;
};

export function RecipeServingControl({ original, base, count, onChange }: Props) {
  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <Text style={styles.label}>Servings</Text>
        {count !== null ? (
          <View style={styles.stepper}>
            <InteractivePressable
              accessibilityLabel="Decrease servings"
              accessibilityHint="Scales ingredient quantities down"
              accessibilityState={{ disabled: count <= 1 }}
              disabled={count <= 1}
              onPress={() => onChange(Math.max(1, count - 1))}
              style={[styles.button, count <= 1 && styles.disabled]}
            >
              <Text style={styles.symbol}>−</Text>
            </InteractivePressable>
            <Text accessibilityLabel={`${count} ${count === 1 ? 'serving' : 'servings'}`} accessibilityLiveRegion="polite" style={styles.count}>
              {count}
            </Text>
            <InteractivePressable
              accessibilityLabel="Increase servings"
              accessibilityHint="Scales ingredient quantities up"
              accessibilityState={{ disabled: count >= MAX_SERVINGS }}
              disabled={count >= MAX_SERVINGS}
              onPress={() => onChange(Math.min(MAX_SERVINGS, count + 1))}
              style={[styles.button, count >= MAX_SERVINGS && styles.disabled]}
            >
              <Text style={styles.symbol}>+</Text>
            </InteractivePressable>
          </View>
        ) : <Text style={styles.count}>{original || '—'}</Text>}
      </View>
      {base === null ? (
        <Text style={styles.hint}>Edit recipe to set a serving count, then scale ingredients here.</Text>
      ) : count !== base ? (
        <View style={styles.row}>
          <Text style={styles.hint}>Original recipe: {base} {base === 1 ? 'serving' : 'servings'}</Text>
          <InteractivePressable accessibilityLabel="Reset servings" onPress={() => onChange(base)} style={styles.reset}>
            <Text style={styles.resetLabel}>Reset</Text>
          </InteractivePressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
  label: { color: colors.accent, ...type.eyebrow },
  stepper: { flexDirection: 'row', alignItems: 'center', padding: spacing.xxs, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.pill, backgroundColor: colors.surface },
  button: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  symbol: { fontSize: 28, lineHeight: 32, color: colors.text },
  count: { minWidth: 54, paddingHorizontal: spacing.xs, textAlign: 'center', fontSize: 20, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  hint: { ...type.body, fontSize: 13, color: colors.textMuted, flexShrink: 1 },
  reset: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm },
  resetLabel: { color: colors.accentPressed, fontWeight: '700', ...type.body },
});
