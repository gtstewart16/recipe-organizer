import type { SupabaseClient } from '@supabase/supabase-js';
import { Directory, File, Paths } from 'expo-file-system';

export const RECIPE_PHOTO_BUCKET = 'recipe-photos';
const STORAGE_PREFIX = `storage://${RECIPE_PHOTO_BUCKET}/`;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export class RecipePhotoError extends Error {}

function photoFile(uri: string) {
  const file = new File(uri);
  if (file.size > MAX_PHOTO_BYTES) throw new RecipePhotoError('Choose a photo smaller than 10 MB.');
  if (file.size === 0) throw new RecipePhotoError('That photo is empty or unavailable. Please choose it again.');
  return file;
}

function filename(uri: string) {
  const extension = uri.split('?')[0].match(/\.([a-zA-Z0-9]+)$/)?.[1] ?? 'jpg';
  return `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
}

export async function copyRecipePhoto(recipeId: string, uri: string) {
  const source = photoFile(uri);
  const directory = new Directory(Paths.document, 'recipe-photos', recipeId);
  directory.create({ intermediates: true, idempotent: true });
  const name = filename(uri);
  const target = new File(directory, name);
  source.copy(target);
  return { heroImageUri: target.uri, heroImageLocalPath: `recipe-photos/${recipeId}/${name}` };
}

export function resolveLocalRecipePhoto<T extends { heroImageLocalPath?: string }>(photo: T): T {
  return photo.heroImageLocalPath
    ? { ...photo, heroImageUri: new File(Paths.document, photo.heroImageLocalPath).uri }
    : photo;
}

export function recipePhotoReference(photo: { heroImageUri?: string; heroImageStoragePath?: string }) {
  return photo.heroImageStoragePath ? `${STORAGE_PREFIX}${photo.heroImageStoragePath}` : photo.heroImageUri ?? null;
}

export async function resolveCloudRecipePhoto(client: SupabaseClient, reference?: string) {
  if (!reference?.startsWith(STORAGE_PREFIX)) return { heroImageUri: reference };
  const heroImageStoragePath = reference.slice(STORAGE_PREFIX.length);
  const { data, error } = await client.storage.from(RECIPE_PHOTO_BUCKET).createSignedUrl(heroImageStoragePath, 60 * 60 * 24 * 7);
  if (error) {
    console.warn('Recipe photo could not be loaded:', error.message);
    return { heroImageStoragePath, heroImageUri: undefined };
  }
  return { heroImageStoragePath, heroImageUri: data.signedUrl };
}

export async function uploadRecipePhoto(client: SupabaseClient, recipeId: string, uri: string, mimeType?: string) {
  const file = photoFile(uri);
  const body = await file.arrayBuffer();
  if (body.byteLength > MAX_PHOTO_BYTES) throw new RecipePhotoError('Choose a photo smaller than 10 MB.');
  const heroImageStoragePath = `${recipeId}/${filename(uri)}`;
  const { error } = await client.storage.from(RECIPE_PHOTO_BUCKET).upload(heroImageStoragePath, body, {
    contentType: mimeType || file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return { heroImageStoragePath };
}
