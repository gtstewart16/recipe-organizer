import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { RecipeGroup, RecipeRecord } from '../../store/recipe-book';
import { GroupsScreen } from './GroupsScreen';

const groups: RecipeGroup[] = [
  { id: 'group-weeknight', name: 'Weeknight', isFavorite: false },
  { id: 'group-weekend', name: 'Weekend', isFavorite: true },
];

const selectedGroup = groups[0];

const recipesForSelectedGroup: RecipeRecord[] = [
  {
    id: 'recipe-1',
    title: 'Cacio E Pepe',
    description: undefined,
    heroImageUri: undefined,
    sourceUrl: 'https://example.com/cacio-e-pepe',
    sourceType: 'url',
    sourcePhotoUris: [],
    ingredients: ['12 ounces spaghetti'],
    instructions: ['Cook the pasta.'],
    servings: '4',
    status: 'ready',
    createdAt: '2026-04-04T12:00:00.000Z',
    updatedAt: '2026-04-04T12:00:00.000Z',
  },
];

function renderGroupsScreen(overrides: Partial<React.ComponentProps<typeof GroupsScreen>> = {}) {
  const props: React.ComponentProps<typeof GroupsScreen> = {
    groups,
    orderedGroups: groups,
    selectedGroup,
    recipesForSelectedGroup,
    newGroupName: 'Breakfast',
    renameGroupName: '',
    syncError: null,
    isRefreshing: false,
    groupedRecipeCount: (groupId) => (groupId === 'group-weeknight' ? 1 : 0),
    onNewGroupNameChange: jest.fn(),
    onRenameGroupNameChange: jest.fn(),
    onCreateGroup: jest.fn(),
    onRenameGroup: jest.fn(),
    onSelectGroup: jest.fn(),
    onToggleGroupFavorite: jest.fn(),
    onDeleteGroup: jest.fn(),
    onRecipePress: jest.fn(),
    onRecipeDelete: jest.fn(),
    ...overrides,
  };

  render(<GroupsScreen {...props} />);

  return props;
}

describe('GroupsScreen', () => {
  it('renders groups, handles primary actions, and shows selected recipes', () => {
    const props = renderGroupsScreen();

    expect(screen.getByText('Groups')).toBeTruthy();
    fireEvent.press(screen.getByText('Add'));
    expect(props.onCreateGroup).toHaveBeenCalledTimes(1);

    fireEvent.press(within(screen.getByTestId('group-content-group-weeknight')).getByText('Weeknight'));
    expect(props.onSelectGroup).toHaveBeenCalledWith('group-weeknight');

    fireEvent.press(screen.getByTestId('groups-favorite-button-group-weeknight'));
    expect(props.onToggleGroupFavorite).toHaveBeenCalledWith(groups[0]);

    expect(screen.getByText('Cacio E Pepe')).toBeTruthy();
  });
});
