import { authStorage } from '../auth/betterAuth';
import type { PdfAssistantMessage } from './pdfAssistant';

const STORAGE_PREFIX = 'campus360_chat_history_v1_';

export async function loadPdfChatHistory(documentId: string): Promise<PdfAssistantMessage[]> {
  if (!documentId) return [];
  try {
    const raw = await authStorage.getItemAsync(`${STORAGE_PREFIX}${documentId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.warn('[chatHistoryStorage] Failed to load chat history for', documentId, err);
    return [];
  }
}

export async function savePdfChatHistory(documentId: string, messages: PdfAssistantMessage[]): Promise<void> {
  if (!documentId) return;
  try {
    // Keep max 50 recent messages to prevent storage bloat
    const trimmed = messages.slice(-50);
    await authStorage.setItemAsync(`${STORAGE_PREFIX}${documentId}`, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[chatHistoryStorage] Failed to save chat history for', documentId, err);
  }
}

export async function clearPdfChatHistory(documentId: string): Promise<void> {
  if (!documentId) return;
  try {
    await authStorage.deleteItemAsync(`${STORAGE_PREFIX}${documentId}`);
  } catch (err) {
    console.warn('[chatHistoryStorage] Failed to clear chat history for', documentId, err);
  }
}
