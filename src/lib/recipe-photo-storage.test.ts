import { copyRecipePhoto, resolveLocalRecipePhoto, resolveCloudRecipePhoto, uploadRecipePhoto } from './recipe-photo-storage';
import { createClient } from '@supabase/supabase-js';

const mockFiles = new Map<string, Uint8Array>();
let mockDocument = 'file:///container-one/documents';
jest.mock('expo-file-system', () => ({
  Paths: { get document() { return mockDocument; } },
  Directory: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
    create() {}
  },
  File: class {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) { this.uri = parts.map(p => typeof p === 'string' ? p : p.uri).join('/'); }
    get size() { return mockFiles.get(this.uri)?.length ?? 0; }
    get type() { return 'image/jpeg'; }
    copy(target: { uri: string }) {
      const data = mockFiles.get(this.uri);
      if (!data) throw new Error('Missing source');
      mockFiles.set(target.uri, data.slice());
    }
    async arrayBuffer() { return mockFiles.get(this.uri)?.slice().buffer; }
  },
}));

beforeEach(() => { mockFiles.clear(); mockDocument = 'file:///container-one/documents'; });

it('keeps a readable document copy when the picker cache is deleted and container changes', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1, 2, 3]));
  // When
  const photo = await copyRecipePhoto('recipe-1', 'file:///cache/picked.jpg');
  mockFiles.delete('file:///cache/picked.jpg');
  // Then
  expect(mockFiles.get(photo.heroImageUri)).toEqual(new Uint8Array([1, 2, 3]));
  mockDocument = 'file:///container-two/documents';
  expect(resolveLocalRecipePhoto(photo).heroImageUri).toBe(`${mockDocument}/${photo.heroImageLocalPath}`);
});

it('rejects oversized photos before attempting an upload', async () => {
  // Given
  mockFiles.set('file:///cache/large.jpg', new Uint8Array(10 * 1024 * 1024 + 1));
  const fetcher = jest.fn();
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  // When / Then
  await expect(uploadRecipePhoto(client, 'recipe-1', 'file:///cache/large.jpg')).rejects.toThrow('10 MB');
  expect(fetcher).not.toHaveBeenCalled();
});

import { createSupabaseRecipeBookPersistence } from './recipe-book-repository';

it('uploads native bytes then patches only the canonical photo reference and signs it on reload', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1, 2, 3]));
  let storedReference = '';
  const fetcher = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/storage/v1/object/sign/')) return new Response(JSON.stringify({ signedURL: '/object/sign/recipe-photos/recipe-1/test.jpg?token=fresh' }), { status: 200 });
    if (url.includes('/storage/v1/object/')) return new Response(JSON.stringify({ Key: 'uploaded' }), { status: 200 });
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body));
      if (!storedReference) expect(Object.keys(body).sort()).toEqual(['hero_image_url', 'updated_at']);
      storedReference = body.hero_image_url;
      return new Response(JSON.stringify({ id: 'recipe-1' }), { status: 200 });
    }
    return new Response(JSON.stringify([{ id: 'recipe-1', title: 'Concurrent title', hero_image_url: storedReference, source_type: 'manual', status: 'ready' }]), { status: 200 });
  });
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  const persistence = createSupabaseRecipeBookPersistence(client);
  // When
  await persistence.replaceRecipePhoto('recipe-1', 'file:///cache/picked.jpg', 'image/jpeg');
  const recipes = await persistence.listRecipes('household-1');
  await persistence.updateRecipe('recipe-1', recipes[0]);
  // Then
  expect(storedReference).toMatch(/^storage:\/\/recipe-photos\/recipe-1\/.+\.jpg$/);
  expect(recipes[0].heroImageStoragePath).toBe(storedReference.replace('storage://recipe-photos/', ''));
  expect(recipes[0].heroImageUri).toContain('token=fresh');
  expect(recipes[0].title).toBe('Concurrent title');
  const upload = fetcher.mock.calls.find(([input]) => String(input).includes('/storage/v1/object/recipe-photos/'));
  expect(upload?.[1]?.body).toBeInstanceOf(ArrayBuffer);
});

it('does not update the recipe when storage upload fails', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1]));
  const fetcher = jest.fn(async () => new Response(JSON.stringify({ message: 'Upload denied' }), { status: 403 }));
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  const persistence = createSupabaseRecipeBookPersistence(client);
  // When / Then
  await expect(persistence.replaceRecipePhoto('recipe-1', 'file:///cache/picked.jpg')).rejects.toThrow('Upload denied');
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('keeps the canonical photo path when a missing object cannot be signed', async () => {
  // Given
  const fetcher = jest.fn(async () => new Response(JSON.stringify({ message: 'Object not found' }), { status: 404 }));
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  const warning = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  // When
  const photo = await resolveCloudRecipePhoto(client, 'storage://recipe-photos/recipe-1/missing.jpg');
  // Then
  expect(photo).toEqual({ heroImageStoragePath: 'recipe-1/missing.jpg', heroImageUri: undefined });
  expect(warning).toHaveBeenCalled();
  warning.mockRestore();
});

it('removes the newly uploaded object when the recipe photo update fails', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1]));
  const fetcher = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ message: 'Write failed' }), { status: 403 });
    return new Response(JSON.stringify({ Key: 'uploaded' }), { status: 200 });
  });
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  // When / Then
  await expect(createSupabaseRecipeBookPersistence(client).replaceRecipePhoto('recipe-1', 'file:///cache/picked.jpg')).rejects.toMatchObject({ message: 'Write failed' });
  expect(fetcher.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
});

it('rejects a photo replacement if the recipe was deleted during upload', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1]));
  const fetcher = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') return new Response(JSON.stringify({ message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' }), { status: 406 });
    return new Response(JSON.stringify({ Key: 'uploaded' }), { status: 200 });
  });
  const client = createClient('https://example.supabase.co', 'anon-key', { global: { fetch: fetcher } });
  // When / Then
  await expect(createSupabaseRecipeBookPersistence(client).replaceRecipePhoto('recipe-1', 'file:///cache/picked.jpg')).rejects.toMatchObject({ code: 'PGRST116' });
  const patch = fetcher.mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(String(patch?.[0])).toContain('select=id');
});

import { createEmptyRecipeBookState, createRecipeBookDraftFromUrl, recipeBookReducer } from '../store/recipe-book';

it('patches the local photo while preserving recipe edits and group membership', async () => {
  // Given
  mockFiles.set('file:///cache/picked.jpg', new Uint8Array([1, 2]));
  const state = recipeBookReducer(createEmptyRecipeBookState(), {
    type: 'recipe/imported',
    payload: { draft: { ...createRecipeBookDraftFromUrl('https://example.com/recipe'), title: 'Latest title', ingredients: ['Latest ingredient'] }, groupIds: ['latest-group'] },
  });
  const photo = await copyRecipePhoto('recipe-1', 'file:///cache/picked.jpg');
  // When
  const updated = recipeBookReducer(state, { type: 'recipe/photoReplaced', payload: { recipeId: 'recipe-1', ...photo } });
  // Then
  expect(updated.recipes[0]).toMatchObject({ title: 'Latest title', ingredients: ['Latest ingredient'], ...photo });
  expect(updated.memberships).toBe(state.memberships);
});
