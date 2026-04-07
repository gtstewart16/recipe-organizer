import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CloudSyncStatus } from './src/components/CloudSyncStatus';
import { ImportFeedbackCard } from './src/components/ImportFeedbackCard';
import { ImportHistorySection } from './src/components/import-history';
import { InteractivePressable } from './src/components/InteractivePressable';
import { RecipeDetailScreen } from './src/components/recipe-detail/RecipeDetailScreen';
import { RecipesHome } from './src/components/recipes-home';
import { SwipeToDeleteRow } from './src/components/swipe-actions';
import {
  getImportFallbackGuidance,
  getImportFeedbackTitle,
  getImportRetryLabel,
  type ImportFeedbackSourceType,
} from './src/lib/import-feedback';
import { createRecipeBookRepository, createSupabaseRecipeBookPersistence } from './src/lib/recipe-book-repository';
import { supabase } from './src/lib/supabase';
import { importRecipeFromPhoto } from './src/services/photo-import';
import { importRecipeFromUrl } from './src/services/url-import';
import {
  createEmptyRecipeBookState,
  createRecipeBookDraftFromUrl,
  ImportJob,
  RecipeBookState,
  RecipeDraft,
  RecipeGroup,
  RecipeRecord,
  recipeBookReducer,
  selectImportHistory,
  selectFilteredRecipes,
} from './src/store/recipe-book';

const STORAGE_KEY = 'recipe-organizer-state-v1';

const HOUSEHOLD_EMAIL = 'home@kitchen.test';
const HOUSEHOLD_PASSWORD = 'password123';

const initialSeedState = seedRecipeBookState();

type TabId = 'recipes' | 'groups' | 'add';

type EditableReviewDraft = RecipeDraft & {
  selectedGroupIds: string[];
};

export default function App() {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const cloudRepository = useMemo(
    () => (supabase ? createRecipeBookRepository(createSupabaseRecipeBookPersistence(supabase)) : null),
    []
  );
  const [state, dispatch] = useReducer(recipeBookReducer, initialSeedState);
  const [hydrated, setHydrated] = useState(isTestEnv || !cloudRepository);
  const [signedIn, setSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [householdEmail, setHouseholdEmail] = useState(HOUSEHOLD_EMAIL);
  const [householdPassword, setHouseholdPassword] = useState(HOUSEHOLD_PASSWORD);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [renameGroupName, setRenameGroupName] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImportingUrl, setIsImportingUrl] = useState(false);
  const [isImportingPhoto, setIsImportingPhoto] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<EditableReviewDraft | null>(null);
  const [activeImportJobId, setActiveImportJobId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastImportSourceType, setLastImportSourceType] = useState<ImportFeedbackSourceType | null>(null);
  const [lastPhotoMode, setLastPhotoMode] = useState<'camera' | 'library'>('library');
  const previousRefreshTargetRef = useRef<string | null>(null);
  const skipNextAutoRefreshTargetRef = useRef<string | null>(null);
  const lastAppStateRef = useRef(AppState.currentState);

  const markCloudSyncSuccess = () => {
    setLastSyncedAt(new Date().toISOString());
    setRefreshError(null);
    setSyncError(null);
  };

  useEffect(() => {
    if (isTestEnv || cloudRepository) {
      return;
    }

    let mounted = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!mounted || !value) {
          return;
        }

        const parsed = JSON.parse(value) as RecipeBookState;
        dispatch({ type: 'state/hydrated', payload: parsed });
      })
      .catch(() => {
        // Keep seed data if persistence is unavailable.
      })
      .finally(() => {
        if (mounted) {
          setHydrated(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [cloudRepository, isTestEnv]);

  useEffect(() => {
    if (!hydrated || cloudRepository) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {
      // Ignore local persistence failures and keep the in-memory session usable.
    });
  }, [cloudRepository, hydrated, state]);

  useEffect(() => {
    if (!signedIn || !cloudRepository) {
      return;
    }

    let mounted = true;
    if (!isTestEnv) {
      setHydrated(false);
    }
    setSyncError(null);

    const load = async () => {
      try {
        const nextState = await cloudRepository.loadState();
        if (mounted) {
          dispatch({ type: 'state/hydrated', payload: nextState });
          markCloudSyncSuccess();
        }
      } catch (error) {
        if (mounted) {
          const message =
            error instanceof Error ? error.message : 'We could not load your shared cloud library right now.';
          setSyncError(message);
          setRefreshError(message);
        }
      } finally {
        if (mounted && !isTestEnv) {
          setHydrated(true);
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [cloudRepository, isTestEnv, signedIn]);

  const refreshTarget = activeTab === 'add' && reviewDraft ? 'add-review' : activeTab;

  const reloadCloudState = async ({ showRefreshing = false }: { showRefreshing?: boolean } = {}) => {
    if (!cloudRepository) {
      return;
    }

    if (showRefreshing) {
      setIsRefreshing(true);
    }

    try {
      const nextState = await cloudRepository.loadState();
      dispatch({ type: 'state/hydrated', payload: nextState });
      markCloudSyncSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'We could not refresh your shared library.';
      setRefreshError(message);
      setSyncError(message);
    } finally {
      if (showRefreshing) {
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    const previousRefreshTarget = previousRefreshTargetRef.current;
    previousRefreshTargetRef.current = refreshTarget;

    if (!signedIn || !cloudRepository || !hydrated || !previousRefreshTarget || previousRefreshTarget === refreshTarget) {
      return;
    }

    if (refreshTarget === 'add-review') {
      return;
    }

    if (skipNextAutoRefreshTargetRef.current === refreshTarget) {
      skipNextAutoRefreshTargetRef.current = null;
      return;
    }

    void reloadCloudState();
  }, [cloudRepository, hydrated, refreshTarget, signedIn]);

  useEffect(() => {
    if (!signedIn || !cloudRepository) {
      return;
    }

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasBackgrounded = /inactive|background/.test(lastAppStateRef.current);
      lastAppStateRef.current = nextAppState;

      if (!wasBackgrounded || nextAppState !== 'active' || !hydrated || refreshTarget === 'add-review') {
        return;
      }

      void reloadCloudState();
    });

    return () => {
      subscription?.remove?.();
    };
  }, [cloudRepository, hydrated, refreshTarget, signedIn]);

  const visibleRecipes = useMemo(() => selectFilteredRecipes(state, searchQuery), [searchQuery, state]);
  const importHistory = useMemo(
    () => selectImportHistory({ ...state, importJobs: state.importJobs ?? [] }),
    [state]
  );
  const favoriteGroups = useMemo(
    () => state.groups.filter((group) => group.isFavorite).sort((left, right) => left.name.localeCompare(right.name)),
    [state.groups]
  );
  const orderedGroups = useMemo(
    () =>
      [...state.groups].sort((left, right) => {
        if (Boolean(left.isFavorite) !== Boolean(right.isFavorite)) {
          return Number(Boolean(right.isFavorite)) - Number(Boolean(left.isFavorite));
        }

        return left.name.localeCompare(right.name);
      }),
    [state.groups]
  );
  const selectedRecipe = state.recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const selectedGroup = state.groups.find((group) => group.id === selectedGroupId) ?? null;
  const selectedRecipeGroupNames = useMemo(() => {
    if (!selectedRecipe) {
      return [];
    }

    return state.memberships
      .filter((membership) => membership.recipeId === selectedRecipe.id)
      .map((membership) => state.groups.find((group) => group.id === membership.groupId)?.name)
      .filter((groupName): groupName is string => Boolean(groupName));
  }, [selectedRecipe, state.groups, state.memberships]);
  const groupedRecipeCount = (groupId: string) =>
    state.memberships.filter((membership) => membership.groupId === groupId).length;

  const handleSignIn = () => {
    if (householdEmail === HOUSEHOLD_EMAIL && householdPassword === HOUSEHOLD_PASSWORD) {
      setSignedIn(true);
      setSignInError(null);
      return;
    }

    if (!householdEmail || !householdPassword) {
      setSignInError('Enter the shared household email and password.');
      return;
    }

    setSignedIn(true);
    setSignInError(null);
  };

  const handleCreateGroup = async () => {
    const trimmed = newGroupName.trim();

    if (!trimmed) {
      return;
    }

    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.createGroup(trimmed);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({
          type: 'group/created',
          payload: { id: `group-${Date.now()}`, name: trimmed },
        });
      }

      setNewGroupName('');
      if (!cloudRepository) {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not create that group.');
    }
  };

  const handleRenameGroup = async () => {
    if (!selectedGroup) {
      return;
    }

    const trimmed = renameGroupName.trim();
    if (!trimmed) {
      return;
    }

    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.renameGroup(selectedGroup.id, trimmed);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({
          type: 'group/renamed',
          payload: { id: selectedGroup.id, name: trimmed },
        });
      }

      setRenameGroupName('');
      if (!cloudRepository) {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not rename that group.');
    }
  };

  const persistImportJob = async (job: ImportJob) => {
    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.upsertImportJob(job);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({ type: 'importJob/upserted', payload: job });
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not update that import draft right now.');
    }
  };

  const beginUrlReview = async () => {
    const trimmedUrl = urlInput.trim();

    if (!trimmedUrl) {
      Alert.alert('Add a link', 'Paste a recipe URL to create a review draft.');
      return;
    }

    setLastImportSourceType('url');
    setImportError(null);
    setIsImportingUrl(true);

    try {
      const draft = await importRecipeFromUrl(trimmedUrl);
      const jobId = createImportJobId();
      const timestamp = new Date().toISOString();

      setActiveImportJobId(jobId);
      setReviewDraft({ ...draft, selectedGroupIds: [] });
      await persistImportJob({
        id: jobId,
        sourceType: 'url',
        sourceUrl: trimmedUrl,
        sourcePhotoUris: [],
        title: draft.title.trim() || createRecipeBookDraftFromUrl(trimmedUrl).title,
        status: 'in_review',
        draft,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not parse that recipe link. Try another page or use manual edits after import.';

      setImportError(
        message
      );
      setActiveImportJobId(null);
      const fallbackDraft = createRecipeBookDraftFromUrl(trimmedUrl);
      const timestamp = new Date().toISOString();
      await persistImportJob({
        id: createImportJobId(),
        sourceType: 'url',
        sourceUrl: trimmedUrl,
        sourcePhotoUris: [],
        title: fallbackDraft.title,
        status: 'failed',
        errorMessage: message,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } finally {
      setIsImportingUrl(false);
    }
  };

  const beginPhotoReview = async (mode: 'camera' | 'library') => {
    setLastImportSourceType('photo');
    setLastPhotoMode(mode);
    setImportError(null);
    setIsImportingPhoto(true);

    let result: ImagePicker.ImagePickerResult;

    try {
      result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              base64: true,
              quality: 0.8,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              allowsMultipleSelection: true,
              base64: true,
              mediaTypes: ['images'],
              quality: 0.8,
            });
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'We could not open your photo picker. Try again in a moment.'
      );
      setIsImportingPhoto(false);
      return;
    }

    if (result.canceled || result.assets.length === 0) {
      setIsImportingPhoto(false);
      return;
    }

    try {
      const draft = await importRecipeFromPhoto(
        result.assets.map((asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType,
          base64: asset.base64,
        }))
      );
      const jobId = createImportJobId();
      const timestamp = new Date().toISOString();

      setActiveImportJobId(jobId);
      setReviewDraft({ ...draft, selectedGroupIds: [] });
      await persistImportJob({
        id: jobId,
        sourceType: 'photo',
        sourcePhotoUris: draft.sourcePhotoUris,
        title: draft.title.trim() || 'Cookbook Recipe Draft',
        status: 'in_review',
        draft,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not parse that cookbook photo. Try another image or review the draft manually.';

      setImportError(
        message
      );
      setActiveImportJobId(null);
      const timestamp = new Date().toISOString();
      await persistImportJob({
        id: createImportJobId(),
        sourceType: 'photo',
        sourcePhotoUris: result.assets.map((asset) => asset.uri),
        title: 'Cookbook Recipe Draft',
        status: 'failed',
        errorMessage: message,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    } finally {
      setIsImportingPhoto(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!reviewDraft) {
      return;
    }

    const normalizedDraft = {
      title: reviewDraft.title.trim() || 'Untitled Recipe',
      description: reviewDraft.description?.trim(),
      heroImageUri: reviewDraft.heroImageUri,
      sourceType: reviewDraft.sourceType,
      sourceUrl: reviewDraft.sourceUrl?.trim(),
      sourcePhotoUris: reviewDraft.sourcePhotoUris,
      ingredients: parseMultilineList(reviewDraft.ingredients.join('\n')),
      instructions: parseMultilineList(reviewDraft.instructions.join('\n')),
      servings: reviewDraft.servings?.trim(),
      prepTime: reviewDraft.prepTime?.trim(),
      cookTime: reviewDraft.cookTime?.trim(),
      status: 'ready' as const,
    };

    if (reviewDraft.selectedGroupIds.length === 0) {
      setImportError('Choose at least one group before confirming the recipe.');
      return;
    }

    let savedRecipeId: string | undefined;

    try {
      if (cloudRepository) {
        const previousRecipeIds = new Set(state.recipes.map((recipe) => recipe.id));
        const nextState = editingRecipeId
          ? await cloudRepository.updateRecipe(editingRecipeId, normalizedDraft, reviewDraft.selectedGroupIds)
          : await cloudRepository.importRecipe(normalizedDraft, reviewDraft.selectedGroupIds);

        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
        savedRecipeId =
          editingRecipeId ??
          findSavedRecipeId(nextState.recipes, previousRecipeIds, normalizedDraft);
      } else if (editingRecipeId) {
        dispatch({
          type: 'recipe/updated',
          payload: {
            recipeId: editingRecipeId,
            draft: normalizedDraft,
            groupIds: reviewDraft.selectedGroupIds,
          },
        });
        savedRecipeId = editingRecipeId;
      } else {
        dispatch({
          type: 'recipe/imported',
          payload: {
            draft: normalizedDraft,
            groupIds: reviewDraft.selectedGroupIds,
          },
        });
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'We could not save that recipe.');
      return;
    }

    if (activeImportJobId && (reviewDraft.sourceType === 'url' || reviewDraft.sourceType === 'photo')) {
      const timestamp = new Date().toISOString();
      const existingJob = state.importJobs.find((job) => job.id === activeImportJobId);

      await persistImportJob({
        id: activeImportJobId,
        sourceType: reviewDraft.sourceType,
        sourceUrl: normalizedDraft.sourceUrl,
        sourcePhotoUris: normalizedDraft.sourcePhotoUris,
        title: normalizedDraft.title,
        status: 'saved',
        recipeId: savedRecipeId,
        createdAt: existingJob?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    }

    setReviewDraft(null);
    setActiveImportJobId(null);
    setEditingRecipeId(null);
    setUrlInput('');
    setImportError(null);
    setSelectedGroupId(reviewDraft.selectedGroupIds[0] ?? null);
    const nextTab = reviewDraft.selectedGroupIds.length > 0 ? 'groups' : 'recipes';
    skipNextAutoRefreshTargetRef.current = nextTab;
    setActiveTab(nextTab);
  };

  const beginRecipeEdit = (recipe: RecipeRecord) => {
    const selectedGroupIds = state.memberships
      .filter((membership) => membership.recipeId === recipe.id)
      .map((membership) => membership.groupId);

    setReviewDraft({
      title: recipe.title,
      description: recipe.description,
      heroImageUri: recipe.heroImageUri,
      sourceType: recipe.sourceType,
      sourceUrl: recipe.sourceUrl,
      sourcePhotoUris: recipe.sourcePhotoUris,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      status: recipe.status,
      selectedGroupIds,
    });
    setEditingRecipeId(recipe.id);
    setSelectedRecipeId(null);
    setActiveTab('add');
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.deleteRecipe(recipeId);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({
          type: 'recipe/deleted',
          payload: { recipeId },
        });
      }

      setSelectedRecipeId(null);
      if (!cloudRepository) {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not delete that recipe.');
    }
  };

  const confirmDeleteRecipe = (recipe: RecipeRecord) => {
    Alert.alert(
      'Delete recipe?',
      `Are you sure you want to delete “${recipe.title}”? This will remove it from your shared library.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteRecipe(recipe.id);
          },
        },
      ]
    );
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.deleteGroup(groupId);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({ type: 'group/deleted', payload: { id: groupId } });
      }

      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
      if (!cloudRepository) {
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not delete that group.');
    }
  };

  const confirmDeleteGroup = (group: RecipeGroup) => {
    Alert.alert(
      'Delete group?',
      `Are you sure you want to delete “${group.name}”? Recipes will stay saved, but they will be removed from this group.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void handleDeleteGroup(group.id);
          },
        },
      ]
    );
  };

  const handleToggleGroupFavorite = async (group: RecipeGroup) => {
    const nextIsFavorite = !group.isFavorite;

    try {
      if (cloudRepository) {
        const nextState = await cloudRepository.setGroupFavorite(group.id, nextIsFavorite);
        dispatch({ type: 'state/hydrated', payload: nextState });
        markCloudSyncSuccess();
      } else {
        dispatch({
          type: 'group/favoriteToggled',
          payload: { id: group.id, isFavorite: nextIsFavorite },
        });
        setSyncError(null);
      }
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'We could not update that favorite group.');
    }
  };

  const handleRetryImport = () => {
    if (lastImportSourceType === 'url') {
      void beginUrlReview();
      return;
    }

    if (lastImportSourceType === 'photo') {
      void beginPhotoReview(lastPhotoMode);
    }
  };

  const handleRetryImportJob = (_jobId: string) => {};
  const handleResumeImportJob = (_jobId: string) => {};
  const handleOpenSavedImportRecipe = (_recipeId: string) => {};

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LinearGradient colors={['#f8f0e7', '#f4ede4', '#fffaf5']} style={styles.authGradient}>
          <View style={styles.authShell}>
            <Text style={styles.eyebrow}>Recipe Organizer</Text>
            <Text style={styles.heroTitle}>Your household recipe library</Text>
            <Text style={styles.heroBody}>
              Enter the shared kitchen account to browse, import, and organize recipes together.
            </Text>
            <View style={styles.authCard}>
              <TextInput
                autoCapitalize="none"
                placeholder="Household email"
                placeholderTextColor="#8a7866"
                style={styles.input}
                value={householdEmail}
                onChangeText={setHouseholdEmail}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#8a7866"
                secureTextEntry
                style={styles.input}
                value={householdPassword}
                onChangeText={setHouseholdPassword}
              />
              {signInError ? <Text style={styles.errorText}>{signInError}</Text> : null}
              <InteractivePressable style={styles.primaryButton} onPress={handleSignIn}>
                <Text style={styles.primaryButtonLabel}>Continue to library</Text>
              </InteractivePressable>
              <Text style={styles.supportText}>
                {cloudRepository
                  ? 'Cloud sync is enabled for the shared household library.'
                  : 'Local MVP mode is enabled until Supabase credentials are added.'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (!hydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.appShell}>
          <HeaderBar />
          <View style={styles.panel}>
            <CloudSyncStatus
              state={syncError ? 'error' : 'loading'}
              title={syncError ? 'Sync paused' : 'Loading your shared recipe library'}
              message={
                syncError ?? 'We’re syncing your recipes, groups, and saved imports from Supabase.'
              }
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <HeaderBar />

        <View style={styles.tabBar}>
          <TabButton label="Recipes" active={activeTab === 'recipes'} onPress={() => setActiveTab('recipes')} />
          <TabButton label="Groups" active={activeTab === 'groups'} onPress={() => setActiveTab('groups')} />
          <TabButton label="Add" active={activeTab === 'add'} onPress={() => setActiveTab('add')} />
        </View>

        {activeTab === 'recipes' ? (
          <ScrollView
            testID="recipes-scroll-view"
            contentContainerStyle={styles.screenContent}
            refreshControl={
              cloudRepository ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
              ) : undefined
            }
          >
            {cloudRepository ? (
              <CloudSyncStatus
                state={refreshError ? 'error' : isRefreshing ? 'loading' : 'success'}
                title={
                  refreshError ? 'Refresh paused' : isRefreshing ? 'Refreshing your shared library' : 'Shared library in sync'
                }
                message={refreshError ?? formatLastSynced(lastSyncedAt)}
              />
            ) : null}
            <RecipesHome
              groups={state.groups}
              favoriteGroupIds={favoriteGroups.map((group) => group.id)}
              recipes={visibleRecipes}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onGroupPress={(group) => {
                setSelectedGroupId(group.id);
                setActiveTab('groups');
              }}
              onFavoriteGroupToggle={(group) => void handleToggleGroupFavorite(group)}
              onRecipeDelete={(recipe) => confirmDeleteRecipe(recipe)}
              onRecipePress={(recipe) => setSelectedRecipeId(recipe.id)}
            />
          </ScrollView>
        ) : null}

        {activeTab === 'groups' ? (
          <ScrollView
            testID="groups-scroll-view"
            contentContainerStyle={styles.screenContent}
            refreshControl={
              cloudRepository ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
              ) : undefined
            }
          >
            <Text style={styles.sectionTitle}>Groups</Text>
            <View style={styles.inlineComposer}>
              <TextInput
                placeholder="Create a group"
                placeholderTextColor="#8a7866"
                style={[styles.input, styles.inlineInput]}
                value={newGroupName}
                onChangeText={setNewGroupName}
              />
              <InteractivePressable style={styles.secondaryButton} onPress={handleCreateGroup}>
                <Text style={styles.secondaryButtonLabel}>Add</Text>
              </InteractivePressable>
            </View>
            {syncError ? <Text style={styles.errorText}>{syncError}</Text> : null}

            {orderedGroups.map((group) => (
              <SwipeToDeleteRow
                key={group.id}
                actionLabel="Delete group"
                actionTestID={`group-delete-${group.id}`}
                contentTestID={`group-content-${group.id}`}
                onAction={() => confirmDeleteGroup(group)}
              >
                <View style={styles.groupRow}>
                  <InteractivePressable style={styles.groupRowMain} onPress={() => setSelectedGroupId(group.id)}>
                    <View>
                      <Text style={styles.groupRowTitle}>{group.name}</Text>
                      <Text style={styles.groupRowMeta}>{groupedRecipeCount(group.id)} recipes</Text>
                    </View>
                  </InteractivePressable>
                  <View style={styles.groupRowActions}>
                    <InteractivePressable
                      style={[styles.groupFavoriteButton, group.isFavorite ? styles.groupFavoriteButtonActive : undefined]}
                      onPress={() => void handleToggleGroupFavorite(group)}
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

            {selectedGroup ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{selectedGroup.name}</Text>
                <View style={styles.inlineComposer}>
                  <TextInput
                    placeholder="Rename group"
                    placeholderTextColor="#8a7866"
                    style={[styles.input, styles.inlineInput]}
                    value={renameGroupName}
                    onChangeText={setRenameGroupName}
                  />
                  <InteractivePressable style={styles.secondaryButton} onPress={handleRenameGroup}>
                    <Text style={styles.secondaryButtonLabel}>Rename</Text>
                  </InteractivePressable>
                </View>
                {recipesForGroup(state, selectedGroup.id).map((recipe) => (
                  <SwipeToDeleteRow
                    key={recipe.id}
                    actionLabel="Delete recipe"
                    actionTestID={`group-recipe-delete-${recipe.id}`}
                    contentTestID={`group-recipe-content-${recipe.id}`}
                    onAction={() => confirmDeleteRecipe(recipe)}
                  >
                    <InteractivePressable
                      style={styles.groupRecipeCard}
                      onPress={() => setSelectedRecipeId(recipe.id)}
                    >
                      <Text style={styles.groupRecipeTitle}>{recipe.title}</Text>
                      <Text style={styles.groupRecipeMeta}>{recipe.instructions[0]}</Text>
                    </InteractivePressable>
                  </SwipeToDeleteRow>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}

        {activeTab === 'add' ? (
          <ScrollView
            testID="add-scroll-view"
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              cloudRepository && !reviewDraft ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
              ) : undefined
            }
          >
            <Text style={styles.sectionTitle}>Add</Text>
            {!reviewDraft ? (
              <>
                <View style={styles.panel}>
                <Text style={styles.panelTitle}>From link</Text>
                <Text style={styles.panelBody}>Paste a recipe URL and turn it into a review draft before saving.</Text>
                <TextInput
                    autoCapitalize="none"
                    placeholder="https://example.com/cacio-e-pepe"
                    placeholderTextColor="#8a7866"
                    style={styles.input}
                  value={urlInput}
                  onChangeText={setUrlInput}
                />
                  {importError && lastImportSourceType === 'url' ? (
                    <ImportFeedbackCard
                      title={getImportFeedbackTitle('url')}
                      message={importError}
                      guidance={getImportFallbackGuidance('url')}
                      primaryAction={{ label: getImportRetryLabel('url'), onPress: handleRetryImport }}
                      secondaryAction={{ label: 'Dismiss', onPress: () => setImportError(null) }}
                    />
                  ) : null}
                  <InteractivePressable style={styles.primaryButton} onPress={beginUrlReview}>
                    <Text style={styles.primaryButtonLabel}>
                      {isImportingUrl ? 'Importing recipe…' : 'Create review draft'}
                    </Text>
                  </InteractivePressable>
                </View>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>From photo</Text>
                  <Text style={styles.panelBody}>Capture cookbook pages or import them from your library.</Text>
                <View style={styles.actionRow}>
                    <InteractivePressable style={styles.secondaryButton} onPress={() => beginPhotoReview('camera')}>
                      <Text style={styles.secondaryButtonLabel}>
                        {isImportingPhoto ? 'Importing photo…' : 'Use camera'}
                      </Text>
                    </InteractivePressable>
                    <InteractivePressable style={styles.secondaryButton} onPress={() => beginPhotoReview('library')}>
                      <Text style={styles.secondaryButtonLabel}>
                        {isImportingPhoto ? 'Importing photo…' : 'Photo library'}
                      </Text>
                    </InteractivePressable>
                  </View>
                  {importError && lastImportSourceType === 'photo' ? (
                    <ImportFeedbackCard
                      title={getImportFeedbackTitle('photo')}
                      message={importError}
                      guidance={getImportFallbackGuidance('photo')}
                      primaryAction={{ label: getImportRetryLabel('photo'), onPress: handleRetryImport }}
                      secondaryAction={{ label: 'Dismiss', onPress: () => setImportError(null) }}
                    />
                  ) : null}
                </View>
                <ImportHistorySection
                  failed={importHistory.failed}
                  inReview={importHistory.inReview}
                  saved={importHistory.saved}
                  onRetry={handleRetryImportJob}
                  onResume={handleResumeImportJob}
                  onOpenRecipe={handleOpenSavedImportRecipe}
                />
              </>
            ) : (
              <View style={styles.panel}>
                <InteractivePressable
                  style={styles.inlineBackButton}
                  onPress={() => {
                    skipNextAutoRefreshTargetRef.current = 'add';
                    setReviewDraft(null);
                    setActiveImportJobId(null);
                    setEditingRecipeId(null);
                  }}
                >
                  <Text style={styles.inlineBackButtonLabel}>Back to import</Text>
                </InteractivePressable>
                <Text style={styles.panelTitle}>Review import</Text>
                <Text style={styles.panelBody}>
                  Edit anything the parser missed, choose a group, then confirm the recipe to save it into your shared library.
                </Text>
                <TextInput
                  style={styles.input}
                  value={reviewDraft.title}
                  onChangeText={(value) => setReviewDraft({ ...reviewDraft, title: value })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Optional description"
                  placeholderTextColor="#8a7866"
                  value={reviewDraft.description ?? ''}
                  onChangeText={(value) => setReviewDraft({ ...reviewDraft, description: value })}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Servings"
                  placeholderTextColor="#8a7866"
                  value={reviewDraft.servings ?? ''}
                  onChangeText={(value) => setReviewDraft({ ...reviewDraft, servings: value })}
                />
                <View style={styles.inlineComposer}>
                  <TextInput
                    style={[styles.input, styles.inlineInput]}
                    placeholder="Prep time"
                    placeholderTextColor="#8a7866"
                    value={reviewDraft.prepTime ?? ''}
                    onChangeText={(value) => setReviewDraft({ ...reviewDraft, prepTime: value })}
                  />
                  <TextInput
                    style={[styles.input, styles.inlineInput]}
                    placeholder="Cook time"
                    placeholderTextColor="#8a7866"
                    value={reviewDraft.cookTime ?? ''}
                    onChangeText={(value) => setReviewDraft({ ...reviewDraft, cookTime: value })}
                  />
                </View>
                <EditableListField
                  label="Ingredients"
                  lines={reviewDraft.ingredients}
                  onChange={(lines) => setReviewDraft({ ...reviewDraft, ingredients: lines })}
                />
                <EditableListField
                  label="Directions"
                  lines={reviewDraft.instructions}
                  onChange={(lines) => setReviewDraft({ ...reviewDraft, instructions: lines })}
                />

                <Text style={styles.sectionLabel}>Save to groups</Text>
                <View style={styles.groupSelectionGrid}>
                  {state.groups.map((group) => {
                    const selected = reviewDraft.selectedGroupIds.includes(group.id);

                    return (
                      <InteractivePressable
                        key={group.id}
                        style={[styles.groupSelectChip, selected ? styles.groupSelectChipActive : null]}
                        onPress={() =>
                          setReviewDraft({
                            ...reviewDraft,
                            selectedGroupIds: selected
                              ? reviewDraft.selectedGroupIds.filter((groupId) => groupId !== group.id)
                              : [...reviewDraft.selectedGroupIds, group.id],
                          })
                        }
                      >
                        <Text style={[styles.groupSelectChipLabel, selected ? styles.groupSelectChipLabelActive : null]}>
                          {group.name}
                        </Text>
                      </InteractivePressable>
                    );
                  })}
                </View>
                {importError ? <Text style={styles.errorText}>{importError}</Text> : null}

                <View style={styles.actionRow}>
                  <InteractivePressable
                    style={styles.secondaryButton}
                    onPress={() => {
                      skipNextAutoRefreshTargetRef.current = 'add';
                      setReviewDraft(null);
                      setActiveImportJobId(null);
                      setEditingRecipeId(null);
                    }}
                  >
                    <Text style={styles.secondaryButtonLabel}>Discard draft</Text>
                  </InteractivePressable>
                  <InteractivePressable style={styles.primaryButtonCompact} onPress={handleSaveRecipe}>
                    <Text style={styles.primaryButtonLabel}>Confirm recipe</Text>
                  </InteractivePressable>
                </View>
              </View>
            )}
          </ScrollView>
        ) : null}

        {selectedRecipe ? (
          <View style={styles.detailOverlay}>
            <RecipeDetailScreen
              recipe={selectedRecipe}
              groupNames={selectedRecipeGroupNames}
              onClose={() => setSelectedRecipeId(null)}
              onEdit={() => beginRecipeEdit(selectedRecipe)}
              onDelete={() => confirmDeleteRecipe(selectedRecipe)}
              onOpenSource={
                selectedRecipe.sourceUrl ? () => Linking.openURL(selectedRecipe.sourceUrl!) : undefined
              }
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function EditableListField({
  label,
  lines,
  onChange,
}: {
  label: string;
  lines: string[];
  onChange: (lines: string[]) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <TextInput
        multiline
        style={[styles.input, styles.multilineInput]}
        value={lines.join('\n')}
        onChangeText={(value) => onChange(parseMultilineList(value))}
      />
    </View>
  );
}

function HeaderBar() {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerBadge}>
        <Text style={styles.headerBadgeText}>MVP</Text>
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <InteractivePressable style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={onPress}>
      <Text style={[styles.tabButtonText, active ? styles.tabButtonTextActive : null]}>{label}</Text>
    </InteractivePressable>
  );
}

function seedRecipeBookState(): RecipeBookState {
  const state = createEmptyRecipeBookState();
  const withGroups = recipeBookReducer(
    recipeBookReducer(
      recipeBookReducer(state, {
        type: 'group/created',
        payload: { id: 'group-weeknight', name: 'Weeknight' },
      }),
      {
        type: 'group/created',
        payload: { id: 'group-weekend', name: 'Weekend' },
      }
    ),
    {
      type: 'group/created',
      payload: { id: 'group-healthy', name: 'Healthy' },
    }
  );

  return recipeBookReducer(withGroups, {
    type: 'recipe/imported',
    payload: {
      draft: {
        ...createRecipeBookDraftFromUrl('https://example.com/jalapeno-popper-turkey-burgers'),
        title: 'Jalapeño Popper Turkey Burgers',
        servings: '6',
      },
      groupIds: ['group-weeknight', 'group-healthy'],
    },
  });
}

function recipesForGroup(state: RecipeBookState, groupId: string): RecipeRecord[] {
  const recipeIds = new Set(
    state.memberships.filter((membership) => membership.groupId === groupId).map((membership) => membership.recipeId)
  );

  return state.recipes.filter((recipe) => recipeIds.has(recipe.id));
}

function createImportJobId() {
  return `import-job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findSavedRecipeId(
  recipes: RecipeRecord[],
  previousRecipeIds: Set<string>,
  draft: Pick<RecipeDraft, 'title' | 'sourceType' | 'sourceUrl'>
) {
  return (
    recipes.find((recipe) => !previousRecipeIds.has(recipe.id))?.id ??
    recipes.find(
      (recipe) =>
        recipe.title === draft.title &&
        recipe.sourceType === draft.sourceType &&
        recipe.sourceUrl === draft.sourceUrl
    )?.id
  );
}

function parseMultilineList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatLastSynced(value: string | null) {
  if (!value) {
    return 'Last synced just now';
  }

  return `Last synced at ${new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f1ea',
  },
  authGradient: {
    flex: 1,
  },
  authShell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 18,
  },
  eyebrow: {
    color: '#a86238',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#241711',
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
  },
  heroBody: {
    color: '#5d4b3d',
    fontSize: 16,
    lineHeight: 24,
  },
  authCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderColor: '#ead8c7',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 18,
    minHeight: 18,
  },
  headerBadge: {
    backgroundColor: '#efe1d3',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerBadgeText: {
    color: '#6e4b34',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  tabButton: {
    backgroundColor: '#efe6dd',
    borderRadius: 18,
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonActive: {
    backgroundColor: '#a86238',
  },
  tabButtonText: {
    color: '#6d5647',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#fff7f2',
  },
  screenContent: {
    gap: 16,
    paddingBottom: 120,
  },
  sectionTitle: {
    color: '#241711',
    fontSize: 30,
    fontWeight: '700',
  },
  sectionLabel: {
    color: '#8a5b3f',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#fffaf5',
    borderColor: '#e6d5c5',
    borderRadius: 18,
    borderWidth: 1,
    color: '#241711',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inlineComposer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  inlineInput: {
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#a86238',
    borderRadius: 18,
    paddingVertical: 15,
  },
  primaryButtonCompact: {
    backgroundColor: '#a86238',
    borderRadius: 18,
    flex: 1,
    paddingVertical: 15,
  },
  primaryButtonLabel: {
    color: '#fffaf5',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#efe6dd',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  secondaryButtonLabel: {
    color: '#6d5647',
    fontSize: 15,
    fontWeight: '700',
  },
  destructiveButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#fbe8e3',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  destructiveButtonLabel: {
    color: '#b33f2f',
    fontSize: 15,
    fontWeight: '700',
  },
  supportText: {
    color: '#7d6758',
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: '#b33f2f',
    fontSize: 14,
    fontWeight: '600',
  },
  panel: {
    backgroundColor: '#fffaf5',
    borderColor: '#e7d7c8',
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  panelTitle: {
    color: '#241711',
    fontSize: 22,
    fontWeight: '700',
  },
  panelBody: {
    color: '#5d4b3d',
    fontSize: 15,
    lineHeight: 22,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  groupRow: {
    alignItems: 'center',
    backgroundColor: '#fffaf5',
    borderColor: '#e7d7c8',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
  },
  groupRowMain: {
    flex: 1,
  },
  groupRowActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  groupRowTitle: {
    color: '#241711',
    fontSize: 18,
    fontWeight: '700',
  },
  groupRowMeta: {
    color: '#7d6758',
    fontSize: 14,
  },
  groupFavoriteButton: {
    alignItems: 'center',
    backgroundColor: '#f2e8dc',
    borderColor: '#e0c8b1',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  groupFavoriteButtonActive: {
    backgroundColor: '#f7e1c8',
    borderColor: '#d59b60',
  },
  groupFavoriteButtonLabel: {
    color: '#8a5b3f',
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 20,
  },
  groupFavoriteButtonLabelActive: {
    color: '#9a5a1e',
  },
  destructiveAction: {
    color: '#b33f2f',
    fontSize: 14,
    fontWeight: '700',
  },
  groupRecipeCard: {
    borderColor: '#eadfd3',
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  groupRecipeTitle: {
    color: '#241711',
    fontSize: 16,
    fontWeight: '700',
  },
  groupRecipeMeta: {
    color: '#5d4b3d',
    fontSize: 14,
  },
  groupSelectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  groupSelectChip: {
    backgroundColor: '#efe6dd',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  groupSelectChipActive: {
    backgroundColor: '#2f6f5d',
  },
  groupSelectChipLabel: {
    color: '#6d5647',
    fontSize: 14,
    fontWeight: '700',
  },
  groupSelectChipLabelActive: {
    color: '#f5fff8',
  },
  detailOverlay: {
    backgroundColor: '#f7f1ea',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  inlineBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#efe6dd',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  inlineBackButtonLabel: {
    color: '#6d5647',
    fontSize: 14,
    fontWeight: '700',
  },
});
