import { useContext } from 'react';
import { ImageBackground, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { InteractivePressable } from '../InteractivePressable';
import { RecipeDirectionsSection } from './RecipeDirectionsSection';
import { RecipeIngredientsSection } from './RecipeIngredientsSection';

export type RecipeDetailRecipe = {
  title: string;
  description?: string;
  heroImageUri?: string;
  sourceUrl?: string;
  servings?: string;
  prepTime?: string;
  cookTime?: string;
  ingredients: string[];
  instructions: string[];
};

export type RecipeDetailScreenProps = {
  recipe: RecipeDetailRecipe;
  groupNames?: string[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSource?: () => void;
};

export function RecipeDetailScreen({
  recipe,
  groupNames = [],
  onClose,
  onEdit,
  onDelete,
  onOpenSource,
}: RecipeDetailScreenProps) {
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const safeTopInset = insets.top > 0 ? insets.top : 44;
  const closeOffsetTop = safeTopInset + 14;
  const metadataItems = [
    { label: 'Servings', value: recipe.servings ?? '—' },
    { label: 'Prep', value: recipe.prepTime ?? '—' },
    { label: 'Cook', value: recipe.cookTime ?? '—' },
  ];

  return (
    <View style={styles.screen} testID="recipe-detail-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroShell}>
          {recipe.heroImageUri ? (
            <ImageBackground
              testID="recipe-detail-hero-image"
              source={{ uri: recipe.heroImageUri }}
              imageStyle={styles.heroImage}
              style={styles.hero}
            >
              <View style={styles.heroOverlay} />
              <View style={styles.heroTextWrap}>
                <Text style={styles.heroTitle}>{recipe.title}</Text>
              </View>
            </ImageBackground>
          ) : (
            <View testID="recipe-detail-hero-fallback" style={styles.heroFallback}>
              <Text style={styles.heroTitle}>{recipe.title}</Text>
            </View>
          )}

          <View style={[styles.heroChrome, { top: closeOffsetTop }]} testID="recipe-detail-close-chrome">
            <InteractivePressable
              testID="recipe-detail-close-button"
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text style={styles.closeButtonLabel}>×</Text>
            </InteractivePressable>
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.metadataGrid}>
            {metadataItems.map((item) => (
              <View key={item.label} style={styles.metadataCard}>
                <Text style={styles.metadataCardLabel}>{item.label}</Text>
                <Text style={styles.metadataCardValue}>{item.value}</Text>
              </View>
            ))}
          </View>

          {groupNames.length > 0 ? (
            <View style={styles.groupsBlock}>
              <Text style={styles.sectionLabel}>Groups</Text>
              <View style={styles.groupChips}>
                {groupNames.map((groupName) => (
                  <View key={groupName} style={styles.groupChip}>
                    <Text style={styles.groupChipLabel}>{groupName}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {recipe.description ? <Text style={styles.description}>{recipe.description}</Text> : null}

          <View style={styles.actionsRow}>
            <InteractivePressable style={styles.secondaryButton} onPress={onEdit}>
              <Text style={styles.secondaryButtonLabel}>Edit recipe</Text>
            </InteractivePressable>
            <InteractivePressable
              style={styles.destructiveButton}
              onPress={onDelete}
              testID="recipe-detail-delete-button"
            >
              <Text style={styles.destructiveButtonLabel}>Delete recipe</Text>
            </InteractivePressable>
          </View>

          {recipe.sourceUrl && onOpenSource ? (
            <InteractivePressable onPress={onOpenSource}>
              <Text style={styles.sourceLink}>Open original recipe</Text>
            </InteractivePressable>
          ) : null}

          <RecipeIngredientsSection ingredients={recipe.ingredients} />
          <RecipeDirectionsSection instructions={recipe.instructions} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f7f1ea',
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  heroShell: {
    position: 'relative',
  },
  hero: {
    height: 360,
    justifyContent: 'flex-end',
  },
  heroImage: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 23, 17, 0.24)',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTextWrap: {
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  heroFallback: {
    backgroundColor: '#eadfd3',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    justifyContent: 'flex-end',
    minHeight: 280,
    paddingHorizontal: 22,
    paddingVertical: 26,
  },
  heroChrome: {
    left: 18,
    position: 'absolute',
    zIndex: 2,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,247,239,0.96)',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  closeButtonLabel: {
    color: '#241711',
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
    marginTop: -2,
  },
  heroTitle: {
    color: '#fff7f2',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  body: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    color: '#5d4b3d',
    fontSize: 16,
    lineHeight: 24,
  },
  metadataGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metadataCard: {
    backgroundColor: '#efe6dd',
    borderRadius: 20,
    flex: 1,
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  metadataCardLabel: {
    color: '#8a5b3f',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  metadataCardValue: {
    color: '#6d5647',
    fontSize: 14,
    fontWeight: '700',
  },
  groupsBlock: {
    gap: 10,
  },
  sectionLabel: {
    color: '#8a5b3f',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  groupChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  groupChip: {
    backgroundColor: '#fff7ef',
    borderColor: '#ead5c2',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  groupChipLabel: {
    color: '#5d4b3d',
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  secondaryButton: {
    backgroundColor: '#efe6dd',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonLabel: {
    color: '#6d5647',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    backgroundColor: '#fbe8e3',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  destructiveButtonLabel: {
    color: '#b33f2f',
    fontSize: 15,
    fontWeight: '700',
  },
  sourceLink: {
    color: '#2c6a7c',
    fontSize: 15,
    fontWeight: '700',
  },
});
