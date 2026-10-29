import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Small JSON lists kept on the phone. SecureStore caps each value at 2 KB, which cut
// the applications list down to one or two entries and cannot hold a library of CVs.
// On web the same key goes to localStorage.

const fileUri = (name: string) => `${FileSystem.documentDirectory}${name}.json`;

export async function readJsonFile<T>(name: string): Promise<T | null> {
  try {
    if (Platform.OS === 'web') {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(name) : null;
      return raw ? (JSON.parse(raw) as T) : null;
    }
    const info = await FileSystem.getInfoAsync(fileUri(name));
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(fileUri(name))) as T;
  } catch (err) {
    console.warn('[localJsonStore] read failed:', name, err);
    return null;
  }
}

export async function writeJsonFile(name: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(name, raw);
      return;
    }
    await FileSystem.writeAsStringAsync(fileUri(name), raw);
  } catch (err) {
    console.warn('[localJsonStore] write failed:', name, err);
  }
}
