export type DocumentExportPolicy = {
  canExportPdf: boolean;
  pdfRequiresWatermark: boolean;
  canExportDocx: boolean;
};

// 100 % prepaid wallet model (no subscription): document generation is already paid with
// coins / IA credits, so every authenticated student exports PDF (no watermark) and DOCX.
export const WALLET_EXPORT_POLICY: DocumentExportPolicy = Object.freeze({
  canExportPdf: true,
  pdfRequiresWatermark: false,
  canExportDocx: true,
});

export const getDocumentExportPolicy = async (_userId: string): Promise<DocumentExportPolicy> =>
  WALLET_EXPORT_POLICY;
