import { databasePool } from './database';
import { listCvTemplatesOn } from './cv-templates-core';

export * from './cv-templates-core';

export const listCvTemplates = () => listCvTemplatesOn(databasePool);
