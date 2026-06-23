declare module 'pdfjs-dist' {
  export function getDocument(input: object): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
    }>;
  };
}
