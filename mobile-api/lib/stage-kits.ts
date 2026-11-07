import { databasePool } from './database';
import {
  appendKitCustomQuestionOn,
  getStageKitOn,
  MAX_KIT_QUESTIONS,
  releaseKitQuestionSlotOn,
  reserveKitQuestionSlotOn,
  saveKitReadyAnswersOn,
  upsertStageKitLetterOn,
  type KitAnswersPayload,
  type KitCustomQuestion,
  type KitDbClient,
  type KitReadyAnswers,
  type StageApplicationKit,
} from './stage-kits-core';

export {
  appendKitCustomQuestionOn,
  getStageKitOn,
  MAX_KIT_QUESTIONS,
  releaseKitQuestionSlotOn,
  reserveKitQuestionSlotOn,
  saveKitReadyAnswersOn,
  upsertStageKitLetterOn,
  type KitAnswersPayload,
  type KitCustomQuestion,
  type KitDbClient,
  type KitReadyAnswers,
  type StageApplicationKit,
};

export const getStageKit = (userId: string, jobId: string) =>
  getStageKitOn(databasePool, userId, jobId);

export const upsertStageKitLetter = (userId: string, jobId: string, letter: string) =>
  upsertStageKitLetterOn(databasePool, userId, jobId, letter);

export const saveKitReadyAnswers = (userId: string, jobId: string, ready: KitReadyAnswers) =>
  saveKitReadyAnswersOn(databasePool, userId, jobId, ready);

export const reserveKitQuestionSlot = (userId: string, jobId: string) =>
  reserveKitQuestionSlotOn(databasePool, userId, jobId);

export const releaseKitQuestionSlot = (userId: string, jobId: string) =>
  releaseKitQuestionSlotOn(databasePool, userId, jobId);

export const appendKitCustomQuestion = (userId: string, jobId: string, item: KitCustomQuestion) =>
  appendKitCustomQuestionOn(databasePool, userId, jobId, item);
