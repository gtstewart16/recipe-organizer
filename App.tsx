import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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
import { InteractivePressable } from './src/components/InteractivePressable';
import { AddRecipeScreen, type EditableReviewDraft } from './src/components/add-recipe';
import { GroupsScreen } from './src/components/groups';
import { RecipeDetailScreen } from './src/components/recipe-detail/RecipeDetailScreen';
import { RecipesHome } from './src/components/recipes-home';
import { SettingsScreen } from './src/components/settings';
import { clearAuthSession, loadAuthSession, persistAuthSession } from './src/lib/auth-session';
import { createSharedImportFromDeepLink } from './src/features/shared-imports/deep-link';
import { processPendingSharedImport } from './src/features/shared-imports/processor';
import { sharedImportStore } from './src/features/shared-imports/store';
import { markSharedImportDuplicate, type PendingSharedImport } from './src/features/shared-imports/types';
import { formatRecipeDuration } from './src/lib/duration';
import type { ImportFeedbackSourceType } from './src/lib/import-feedback';
import { createRecipeBookRepository, createSupabaseRecipeBookPersistence } from './src/lib/recipe-book-repository';
import { parseMultilineList } from './src/lib/recipe-text';
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
  selectFilteredRecipes,
  selectImportHistory,
} from './src/store/recipe-book';
import { colors, radius, shadows, spacing, type } from './src/theme';

const STORAGE_KEY = 'recipe-organizer-state-v1';

const HOUSEHOLD_EMAIL = 'home@kitchen.test';
const HOUSEHOLD_PASSWORD = 'password123';

const initialSeedState = seedRecipeBookState();

type TabId = 'recipes' | 'groups' | 'add';

type StoredPhotoAsset = {
  uri: string;
  mimeType?: string;
  base64?: string | null;
};

export default function App() {
  const isTestEnv = process.env.NODE_ENV === 'test';
  const cloudRepository = useMemo(
    () => (supabase ? createRecipeBookRepository(createSupabaseRecipeBookPersistence(supabase)) : null),
    []
  );
  const [state, dispatch] = useReducer(recipeBookReducer, initialSeedState);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [hydrated, setHydrated] = useState(isTestEnv || !cloudRepository);
  const [signedIn, setSignedIn] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('recipes');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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
  const [sharedImports, setSharedImports] = useState<PendingSharedImport[]>([]);
  const [activeSharedImportId, setActiveSharedImportId] = useState<string | null>(null);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastImportSourceType, setLastImportSourceType] = useState<ImportFeedbackSourceType | null>(null);
  const [lastPhotoMode, setLastPhotoMode] = useState<'camera' | 'library'>('library');
  const previousRefreshTargetRef = useRef<string | null>(null);
  const skipNextAutoRefreshTargetRef = useRef<string | null>(null);
  const didHandleInitialUrlRef = useRef(false);
  const lastAppStateRef = useRef(AppState.currentState);

  const markCloudSyncSuccess = () => {
    setLastSyncedAt(new Date().toISOString());
    setRefreshError(null);
    setSyncError(null);
  };

  useEffect(() => {
    let mounted = true;

    loadAuthSession()
      .then((hasSession) => {
        if (mounted) {
          setSignedIn(hasSession);
        }
      })
      .catch(() => {
        if (mounted) {
          setSignedIn(false);
        }
      })
      .finally(() => {
        if (mounted) {
          setAuthHydrated(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  const showSyncIssue = () => {
    const message = refreshError ?? syncError ?? 'We could not refresh your shared library.';
    const title = refreshError ? 'Refresh paused' : 'Sync paused';

    Alert.alert(title, message, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Try again', onPress: () => void reloadCloudState({ showRefreshing: true }) },
    ]);
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
  const importHistory = useMemo(() => selectImportHistory(state), [state]);
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

  const sortSharedImports = (items: PendingSharedImport[]) =>
    [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

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
      if (job.status !== 'saved') {
        setSyncError(error instanceof Error ? error.message : 'We could not update that import draft right now.');
      }
    }
  };

  const refreshSharedImports = useCallback(async () => {
    try {
      const records = await sharedImportStore.list();
      setSharedImports(sortSharedImports(records));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'We could not load shared imports.');
    }
  }, []);

  const refreshAndProcessSharedImports = useCallback(async () => {
    try {
      const records = await sharedImportStore.list();
      const processedRecords = await Promise.all(
        records.map((record) =>
          record.status === 'pending' || record.status === 'processing'
            ? processPendingSharedImport({ ...record, status: 'processing' })
            : record
        )
      );
      const changedRecords = processedRecords.filter(
        (record, index) => JSON.stringify(record) !== JSON.stringify(records[index])
      );

      for (const record of changedRecords) {
        await sharedImportStore.replaceExisting(record);
      }

      await refreshSharedImports();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'We could not process shared imports.');
    }
  }, [refreshSharedImports]);

  const openSharedImportForReview = useCallback(
    async (record: PendingSharedImport) => {
      if (record.status === 'duplicate' && record.recipeId) {
        setImportError(null);
        setSelectedRecipeId(record.recipeId);
        return;
      }

      if (!record.draft) {
        setImportError('This shared import is not ready to review yet.');
        setActiveTab('add');
        return;
      }

      const selectedGroupIds = readSelectedGroupIds(record.draft);
      const reviewImportDraft = { ...record.draft, selectedGroupIds };
      const timestamp = new Date().toISOString();
      const existingJob =
        record.draft.sourceType === 'url'
          ? state.importJobs.find(
              (job) =>
                job.status === 'in_review' &&
                job.sourceType === 'url' &&
                job.sourceUrl === record.draft?.sourceUrl
            )
          : undefined;
      const jobId =
        record.draft.sourceType === 'url' || record.draft.sourceType === 'photo'
          ? existingJob?.id ?? createImportJobId()
          : null;

      setImportError(null);
      setActiveSharedImportId(record.id);
      setActiveImportJobId(jobId);
      setEditingRecipeId(null);
      setReviewDraft(reviewImportDraft);
      setActiveTab('add');

      if (jobId && (record.draft.sourceType === 'url' || record.draft.sourceType === 'photo')) {
        await persistImportJob({
          id: jobId,
          sourceType: record.draft.sourceType,
          sourceUrl: record.draft.sourceUrl,
          sourcePhotoUris: record.draft.sourcePhotoUris,
          title: record.draft.title.trim() || 'Imported Recipe',
          status: 'in_review',
          draft: reviewImportDraft,
          createdAt: existingJob?.createdAt ?? timestamp,
          updatedAt: timestamp,
        });
      }
    },
    [state.importJobs]
  );

  const handleSharedImportDeepLink = useCallback(
    async (url: string) => {
      const record = createSharedImportFromDeepLink(url);

      if (!record) {
        return;
      }

      try {
        const existingRecipe = findExistingRecipeForSharedImport(record, state.recipes);

        if (existingRecipe) {
          const duplicateRecord = markSharedImportDuplicate(record, {
            recipeId: existingRecipe.id,
            title: existingRecipe.title,
          });
          const queuedRecord = await sharedImportStore.enqueue(duplicateRecord);
          const recordToShow =
            queuedRecord.status === 'duplicate' && queuedRecord.recipeId
              ? queuedRecord
              : { ...queuedRecord, ...duplicateRecord, id: queuedRecord.id };

          if (recordToShow !== queuedRecord) {
            await sharedImportStore.save(recordToShow);
          }

          setImportError(null);
          setActiveTab('add');
          await refreshSharedImports();
          return;
        }

        const processingRecord = { ...record, status: 'processing' as const };
        const queuedRecord = await sharedImportStore.enqueue(processingRecord);
        setImportError(null);
        setActiveTab('add');
        await refreshSharedImports();
        const processedRecord = await processPendingSharedImport(
          queuedRecord.status === 'processing' || queuedRecord.status === 'pending'
            ? queuedRecord
            : processingRecord
        );
        await sharedImportStore.replaceExisting(processedRecord);
        await refreshSharedImports();

        if (processedRecord.status === 'ready') {
          await openSharedImportForReview(processedRecord);
        }
      } catch (error) {
        setImportError(error instanceof Error ? error.message : 'We could not queue that shared import.');
        setActiveTab('add');
      }
    },
    [openSharedImportForReview, refreshSharedImports, state.recipes]
  );

  useEffect(() => {
    let mounted = true;

    if (!didHandleInitialUrlRef.current) {
      didHandleInitialUrlRef.current = true;
      Linking.getInitialURL()
        .then((url) => {
          if (mounted && url) {
            void handleSharedImportDeepLink(url);
          }
        })
        .catch(() => {
          // Ignore malformed or unavailable launch links.
        });
    }

    const subscription = Linking.addEventListener('url', (event) => {
      void handleSharedImportDeepLink(event.url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [handleSharedImportDeepLink]);

  useEffect(() => {
    if (!signedIn || !hydrated || activeTab !== 'add' || reviewDraft) {
      return;
    }

    void refreshAndProcessSharedImports();
  }, [activeTab, hydrated, refreshAndProcessSharedImports, reviewDraft, signedIn]);

  const resetSignedInShellState = () => {
    previousRefreshTargetRef.current = null;
    skipNextAutoRefreshTargetRef.current = null;
    lastAppStateRef.current = AppState.currentState;
    setActiveTab('recipes');
    setSelectedRecipeId(null);
    setSelectedGroupId(null);
    setIsSettingsOpen(false);
    setSearchQuery('');
    setSignInError(null);
    setNewGroupName('');
    setRenameGroupName('');
    setUrlInput('');
    setImportError(null);
    setIsImportingUrl(false);
    setIsImportingPhoto(false);
    setReviewDraft(null);
    setActiveImportJobId(null);
    setSharedImports([]);
    setActiveSharedImportId(null);
    setEditingRecipeId(null);
    setSyncError(null);
    setRefreshError(null);
    setIsRefreshing(false);
    setLastSyncedAt(null);
    setLastImportSourceType(null);
    setLastPhotoMode('library');
  };

  const handleSignIn = () => {
    if (householdEmail === HOUSEHOLD_EMAIL && householdPassword === HOUSEHOLD_PASSWORD) {
      setSignedIn(true);
      setSignInError(null);
      void persistAuthSession().catch(() => {
        // Keep the in-memory session usable even if persistence is unavailable.
      });
      return;
    }

    if (!householdEmail || !householdPassword) {
      setSignInError('Enter the shared household email and password.');
      return;
    }

    setSignedIn(false);
    setSignInError('Use the shared household email and password.');
  };

  const handleSignOut = async () => {
    try {
      await clearAuthSession();
      resetSignedInShellState();
      setSignedIn(false);
    } catch {
      Alert.alert('Could not sign out', 'Please try again in a moment.');
    }
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

  const startUrlReview = async ({
    sourceUrl,
    existingJobId,
  }: {
    sourceUrl: string;
    existingJobId?: string;
  }) => {
    const trimmedUrl = sourceUrl.trim();

    if (!trimmedUrl) {
      Alert.alert('Add a link', 'Paste a recipe URL to create a review draft.');
      return;
    }

    setLastImportSourceType('url');
    setImportError(null);
    setIsImportingUrl(true);

    try {
      const draft = await importRecipeFromUrl(trimmedUrl);
      const jobId = existingJobId ?? createImportJobId();
      const timestamp = new Date().toISOString();
      const existingJob = state.importJobs.find((job) => job.id === jobId);

      setUrlInput(trimmedUrl);
      setActiveImportJobId(jobId);
      setActiveSharedImportId(null);
      setReviewDraft({ ...draft, selectedGroupIds: [] });
      await persistImportJob({
        id: jobId,
        sourceType: 'url',
        sourceUrl: trimmedUrl,
        sourcePhotoUris: [],
        title: draft.title.trim() || createRecipeBookDraftFromUrl(trimmedUrl).title,
        status: 'in_review',
        draft,
        createdAt: existingJob?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not parse that recipe link. Try another page or use manual edits after import.';
      const jobId = existingJobId ?? createImportJobId();
      const existingJob = state.importJobs.find((job) => job.id === jobId);

      setImportError(
        message
      );
      setActiveImportJobId(null);
      const fallbackDraft = createRecipeBookDraftFromUrl(trimmedUrl);
      const timestamp = new Date().toISOString();
      await persistImportJob({
        id: jobId,
        sourceType: 'url',
        sourceUrl: trimmedUrl,
        sourcePhotoUris: [],
        title: fallbackDraft.title,
        status: 'failed',
        errorMessage: message,
        createdAt: existingJob?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    } finally {
      setIsImportingUrl(false);
    }
  };

  const beginUrlReview = async () => {
    const trimmedUrl = urlInput.trim();

    if (createSharedImportFromDeepLink(trimmedUrl)) {
      await handleSharedImportDeepLink(trimmedUrl);
      setUrlInput('');
      return;
    }

    await startUrlReview({ sourceUrl: urlInput });
  };

  const beginPhotoReview = async (mode: 'camera' | 'library', existingJobId?: string) => {
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
      const jobId = existingJobId ?? createImportJobId();
      const timestamp = new Date().toISOString();
      const existingJob = state.importJobs.find((job) => job.id === jobId);

      setActiveImportJobId(jobId);
      setActiveSharedImportId(null);
      setReviewDraft({ ...draft, selectedGroupIds: [] });
      await persistImportJob({
        id: jobId,
        sourceType: 'photo',
        sourcePhotoUris: draft.sourcePhotoUris,
        title: draft.title.trim() || 'Cookbook Recipe Draft',
        status: 'in_review',
        draft,
        createdAt: existingJob?.createdAt ?? timestamp,
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
      const jobId = existingJobId ?? createImportJobId();
      const existingJob = state.importJobs.find((job) => job.id === jobId);
      await persistImportJob({
        id: jobId,
        sourceType: 'photo',
        sourcePhotoUris: result.assets.map((asset) => asset.uri),
        title: 'Cookbook Recipe Draft',
        status: 'failed',
        errorMessage: message,
        createdAt: existingJob?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    } finally {
      setIsImportingPhoto(false);
    }
  };

  const retryPhotoImportJob = async (job: ImportJob) => {
    if (job.sourcePhotoUris.length === 0) {
      Alert.alert('Cannot retry import', 'This saved import no longer has its original cookbook photo.');
      return;
    }

    setLastImportSourceType('photo');
    setImportError(null);
    setIsImportingPhoto(true);

    try {
      const storedAssets = await readStoredPhotoAssets(job.sourcePhotoUris);

      if (storedAssets.length === 0) {
        Alert.alert('Cannot retry import', 'This saved import no longer has a readable cookbook photo.');
        return;
      }

      const draft = await importRecipeFromPhoto(storedAssets);
      const timestamp = new Date().toISOString();
      const sourcePhotoUris = draft.sourcePhotoUris.length > 0 ? draft.sourcePhotoUris : job.sourcePhotoUris;
      const reviewImportDraft = {
        ...draft,
        sourcePhotoUris,
        selectedGroupIds: job.draft?.selectedGroupIds ?? [],
      };

      setActiveImportJobId(job.id);
      setEditingRecipeId(null);
      setReviewDraft(reviewImportDraft);
      setActiveTab('add');
      await persistImportJob({
        id: job.id,
        sourceType: 'photo',
        sourcePhotoUris,
        title: draft.title.trim() || job.title || 'Cookbook Recipe Draft',
        status: 'in_review',
        draft: reviewImportDraft,
        createdAt: job.createdAt,
        updatedAt: timestamp,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not parse that cookbook photo. Try another image or review the draft manually.';
      const timestamp = new Date().toISOString();

      setImportError(message);
      setActiveImportJobId(null);
      await persistImportJob({
        ...job,
        status: 'failed',
        errorMessage: message,
        updatedAt: timestamp,
      });
    } finally {
      setIsImportingPhoto(false);
    }
  };

  const persistActiveReviewDraft = async (draft: EditableReviewDraft) => {
    if (activeSharedImportId) {
      const existingShare = sharedImports.find((item) => item.id === activeSharedImportId);

      if (existingShare) {
        await sharedImportStore.save({
          ...existingShare,
          status: 'ready',
          draft,
          errorMessage: undefined,
          updatedAt: new Date().toISOString(),
        });
        await refreshSharedImports();
      }

      return;
    }

    if (!activeImportJobId || (draft.sourceType !== 'url' && draft.sourceType !== 'photo')) {
      return;
    }

    const timestamp = new Date().toISOString();
    const existingJob = state.importJobs.find((job) => job.id === activeImportJobId);

    await persistImportJob({
      id: activeImportJobId,
      sourceType: draft.sourceType,
      sourceUrl: draft.sourceUrl?.trim(),
      sourcePhotoUris: draft.sourcePhotoUris,
      title: draft.title.trim() || existingJob?.title || 'Imported Recipe',
      status: 'in_review',
      draft,
      createdAt: existingJob?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
  };

  const handleTabPress = (nextTab: TabId) => {
    if (activeTab === nextTab) {
      return;
    }

    const draftToPersist = reviewDraft;

    if (activeTab === 'add' && draftToPersist) {
      void (async () => {
        await persistActiveReviewDraft(draftToPersist);
        skipNextAutoRefreshTargetRef.current = nextTab;
        setActiveTab(nextTab);
      })();
      return;
    }

    if (nextTab === 'add' && !draftToPersist) {
      void refreshAndProcessSharedImports();
    }

    setActiveTab(nextTab);
  };

  const handleOpenSharedImport = (id: string) => {
    const match = sharedImports.find((item) => item.id === id);

    if (!match) {
      setImportError('This shared import is not ready to review yet.');
      return;
    }

    void openSharedImportForReview(match);
  };

  const handleRetrySharedImport = async (id: string) => {
    const match = sharedImports.find((item) => item.id === id);

    if (!match) {
      return;
    }

    const nextRecord = await processPendingSharedImport({
      ...match,
      status: 'pending',
      errorMessage: undefined,
    });

    await sharedImportStore.save(nextRecord);
    await refreshSharedImports();
  };

  const handleDismissSharedImport = async (id: string) => {
    await sharedImportStore.remove(id);
    await refreshSharedImports();
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
      prepTime: formatRecipeDuration(reviewDraft.prepTime),
      cookTime: formatRecipeDuration(reviewDraft.cookTime),
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
        draft: {
          ...normalizedDraft,
          selectedGroupIds: reviewDraft.selectedGroupIds,
        },
        recipeId: savedRecipeId,
        createdAt: existingJob?.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    }

    if (activeSharedImportId && !activeImportJobId && (reviewDraft.sourceType === 'url' || reviewDraft.sourceType === 'photo')) {
      const timestamp = new Date().toISOString();

      await persistImportJob({
        id: createImportJobId(),
        sourceType: reviewDraft.sourceType,
        sourceUrl: normalizedDraft.sourceUrl,
        sourcePhotoUris: normalizedDraft.sourcePhotoUris,
        title: normalizedDraft.title,
        status: 'saved',
        draft: {
          ...normalizedDraft,
          selectedGroupIds: reviewDraft.selectedGroupIds,
        },
        recipeId: savedRecipeId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    if (activeSharedImportId) {
      try {
        await sharedImportStore.remove(activeSharedImportId);
        await refreshSharedImports();
      } catch {
        // Queue cleanup should not strand the user after the recipe is already saved.
      }
    }

    setReviewDraft(null);
    setActiveImportJobId(null);
    setActiveSharedImportId(null);
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
    setActiveSharedImportId(null);
    setActiveImportJobId(null);
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

  const handleRetryImportJob = (job: ImportJob) => {
    setImportError(null);

    if (job.sourceType === 'url') {
      if (!job.sourceUrl) {
        Alert.alert('Cannot retry import', 'This saved import no longer has its original recipe link.');
        return;
      }

      void startUrlReview({ sourceUrl: job.sourceUrl, existingJobId: job.id });
      return;
    }

    void retryPhotoImportJob(job);
  };

  const handleResumeImportJob = (job: ImportJob) => {
    if (!job.draft) {
      Alert.alert('Cannot resume import', 'This import draft no longer has review details saved.');
      return;
    }

    setImportError(null);
    setActiveImportJobId(job.id);
    setActiveSharedImportId(null);
    setEditingRecipeId(null);
    setReviewDraft({ ...job.draft, selectedGroupIds: job.draft.selectedGroupIds ?? [] });
    setActiveTab('add');
  };

  const handleOpenImportRecipe = (job: ImportJob) => {
    if (!job.recipeId) {
      Alert.alert('Recipe unavailable', 'This saved import is no longer linked to a recipe.');
      return;
    }

    setSelectedRecipeId(job.recipeId);
  };

  if (isSettingsOpen) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <SettingsScreen onClose={() => setIsSettingsOpen(false)} onSignOut={() => void handleSignOut()} />
      </SafeAreaView>
    );
  }

  if (!authHydrated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.appShell}>
          <HeaderBar onOpenSettings={() => setIsSettingsOpen(true)} />
          <View style={styles.panel}>
            <CloudSyncStatus
              state="loading"
              title="Restoring your household session"
              message="We’re checking whether this device already has access to the shared kitchen library."
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!signedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <LinearGradient colors={[colors.background, colors.surfaceWarm, colors.surface]} style={styles.authGradient}>
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
                placeholderTextColor={colors.textSubtle}
                style={styles.input}
                value={householdEmail}
                onChangeText={setHouseholdEmail}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor={colors.textSubtle}
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
          <HeaderBar onOpenSettings={() => setIsSettingsOpen(true)} />
          <View style={styles.panel}>
            <CloudSyncStatus
              state={syncError ? 'error' : 'loading'}
              title={syncError ? 'Sync paused' : 'Loading your shared recipe library'}
              message={
                syncError ?? 'We’re syncing your recipes, groups, and saved imports from Supabase.'
              }
              actionLabel={syncError ? 'View sync issue' : undefined}
              onActionPress={syncError ? showSyncIssue : undefined}
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
        <HeaderBar onOpenSettings={() => setIsSettingsOpen(true)} />

        <View style={styles.tabBar}>
          <TabButton label="Recipes" active={activeTab === 'recipes'} onPress={() => handleTabPress('recipes')} />
          <TabButton label="Groups" active={activeTab === 'groups'} onPress={() => handleTabPress('groups')} />
          <TabButton label="Add" active={activeTab === 'add'} onPress={() => handleTabPress('add')} />
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
            {cloudRepository && (refreshError || isRefreshing) ? (
              <CloudSyncStatus
                state={refreshError ? 'error' : 'loading'}
                title={refreshError ? 'Refresh paused' : 'Refreshing your shared library'}
                message={refreshError ?? formatLastSynced(lastSyncedAt)}
                actionLabel={refreshError ? 'View sync issue' : undefined}
                onActionPress={refreshError ? showSyncIssue : undefined}
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
          <GroupsScreen
            groups={state.groups}
            orderedGroups={orderedGroups}
            selectedGroup={selectedGroup}
            recipesForSelectedGroup={selectedGroup ? recipesForGroup(state, selectedGroup.id) : []}
            newGroupName={newGroupName}
            renameGroupName={renameGroupName}
            syncError={syncError}
            refreshControl={
              cloudRepository ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
              ) : undefined
            }
            groupedRecipeCount={groupedRecipeCount}
            onNewGroupNameChange={setNewGroupName}
            onRenameGroupNameChange={setRenameGroupName}
            onCreateGroup={handleCreateGroup}
            onRenameGroup={handleRenameGroup}
            onSelectGroup={setSelectedGroupId}
            onToggleGroupFavorite={(group) => void handleToggleGroupFavorite(group)}
            onDeleteGroup={confirmDeleteGroup}
            onRecipePress={setSelectedRecipeId}
            onRecipeDelete={confirmDeleteRecipe}
          />
        ) : null}

        {activeTab === 'add' ? (
          <AddRecipeScreen
            groups={state.groups}
            reviewDraft={reviewDraft}
            urlInput={urlInput}
            importError={importError}
            lastImportSourceType={lastImportSourceType}
            isImportingUrl={isImportingUrl}
            isImportingPhoto={isImportingPhoto}
            sharedImportQueue={{
              items: sharedImports,
              onOpen: handleOpenSharedImport,
              onRetry: (id) => void handleRetrySharedImport(id),
              onDismiss: (id) => void handleDismissSharedImport(id),
            }}
            importHistory={{
              history: importHistory,
              onRetryImport: handleRetryImportJob,
              onResumeReview: handleResumeImportJob,
              onOpenRecipe: handleOpenImportRecipe,
            }}
            refreshControl={
              cloudRepository && !reviewDraft ? (
                <RefreshControl refreshing={isRefreshing} onRefresh={() => void reloadCloudState({ showRefreshing: true })} />
              ) : undefined
            }
            onUrlInputChange={setUrlInput}
            onBeginUrlReview={() => void beginUrlReview()}
            onBeginPhotoReview={(mode) => void beginPhotoReview(mode)}
            onRetryImport={handleRetryImport}
            onDismissImportError={() => setImportError(null)}
            onReviewDraftChange={setReviewDraft}
            onBackToImport={() => {
              const draftToPersist = reviewDraft;

              void (async () => {
                if (draftToPersist) {
                  await persistActiveReviewDraft(draftToPersist);
                }

                skipNextAutoRefreshTargetRef.current = 'add';
                setReviewDraft(null);
                setActiveImportJobId(null);
                setActiveSharedImportId(null);
                setEditingRecipeId(null);
              })();
            }}
            onDiscardDraft={() => {
              skipNextAutoRefreshTargetRef.current = 'add';
              setReviewDraft(null);
              setActiveImportJobId(null);
              setActiveSharedImportId(null);
              setEditingRecipeId(null);
            }}
            onSaveRecipe={() => void handleSaveRecipe()}
          />
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

function HeaderBar({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <View style={styles.headerBar}>
      <InteractivePressable accessibilityLabel="Open settings" onPress={onOpenSettings} style={styles.headerUtilityButton}>
        <Text style={styles.headerUtilityButtonText}>Settings</Text>
      </InteractivePressable>
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
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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

function findExistingRecipeForSharedImport(record: PendingSharedImport, recipes: RecipeRecord[]) {
  if (record.sourceKind !== 'url' || !('url' in record.payload)) {
    return undefined;
  }

  const sharedUrl = normalizeRecipeSourceUrl(record.payload.url);
  if (!sharedUrl) {
    return undefined;
  }

  return recipes.find((recipe) => normalizeRecipeSourceUrl(recipe.sourceUrl) === sharedUrl);
}

function normalizeRecipeSourceUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value.trim());
    parsed.hash = '';
    parsed.search = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

function readSelectedGroupIds(draft: RecipeDraft) {
  if ('selectedGroupIds' in draft && Array.isArray(draft.selectedGroupIds)) {
    return draft.selectedGroupIds;
  }

  return [];
}

async function readStoredPhotoAssets(sourcePhotoUris: string[]): Promise<StoredPhotoAsset[]> {
  const assets = await Promise.all(
    sourcePhotoUris.map(async (uri): Promise<StoredPhotoAsset | null> => {
      try {
        return {
          uri,
          mimeType: inferImageMimeType(uri),
          base64: await FileSystem.readAsStringAsync(uri, { encoding: 'base64' }),
        };
      } catch {
        return null;
      }
    })
  );

  return assets.filter((asset): asset is StoredPhotoAsset => Boolean(asset));
}

function inferImageMimeType(uri: string) {
  const normalizedUri = uri.toLowerCase();

  if (normalizedUri.endsWith('.png')) {
    return 'image/png';
  }

  if (normalizedUri.endsWith('.webp')) {
    return 'image/webp';
  }

  return 'image/jpeg';
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
    backgroundColor: colors.background,
  },
  authGradient: {
    flex: 1,
  },
  authShell: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  eyebrow: {
    ...type.eyebrow,
    color: colors.accent,
  },
  heroTitle: {
    ...type.title,
    color: colors.text,
  },
  heroBody: {
    ...type.body,
    color: colors.textMuted,
  },
  authCard: {
    ...shadows.floating,
    backgroundColor: 'rgba(255,253,249,0.92)',
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  appShell: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  headerBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.lg,
    minHeight: 36,
  },
  headerUtilityButton: {
    backgroundColor: colors.surfaceWarm,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  headerUtilityButtonText: {
    ...type.eyebrow,
    color: colors.accentPressed,
  },
  tabBar: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.xs,
  },
  tabButton: {
    backgroundColor: 'transparent',
    borderRadius: radius.md,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  tabButtonActive: {
    ...shadows.card,
    backgroundColor: colors.surface,
  },
  tabButtonText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: colors.accentPressed,
  },
  screenContent: {
    gap: spacing.md,
    paddingBottom: 120,
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
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 15,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  supportText: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
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
  detailOverlay: {
    backgroundColor: colors.background,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
});
