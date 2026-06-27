import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

/**
 * Generates a watermarked preview of the first page of the provided PDF buffer.
 * Overlays a diagonal, semi-transparent watermark centered on the page.
 */
export async function generateWatermarkedPreview(
  pdfBuffer: Buffer,
  watermarkText: string = 'Campus 3602 Preview'
): Promise<Buffer> {
  // Load the full PDF document
  const srcDoc = await PDFDocument.load(pdfBuffer);
  
  const pageCount = srcDoc.getPageCount();
  if (pageCount === 0) {
    throw new Error('Le document PDF ne contient aucune page.');
  }

  // Create a new PDF document
  const previewDoc = await PDFDocument.create();
  
  // Copy the first page (index 0) of the source PDF
  const [copiedPage] = await previewDoc.copyPages(srcDoc, [0]);
  
  // Add the copied page to the new document
  const page = previewDoc.addPage(copiedPage);
  
  // Embed the Standard Helvetica-Bold font
  const helveticaBold = await previewDoc.embedFont(StandardFonts.HelveticaBold);
  
  const fontSize = 40;
  const textWidth = helveticaBold.widthOfTextAtSize(watermarkText, fontSize);
  const textHeight = helveticaBold.heightAtSize(fontSize);
  
  const { width, height } = page.getSize();
  
  // Calculate centering coordinates for a 45-degree rotation
  const theta = 45;
  const rad = (theta * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  
  const x = width / 2 - (textWidth / 2) * cos + (textHeight / 2) * sin;
  const y = height / 2 - (textWidth / 2) * sin - (textHeight / 2) * cos;
  
  // Draw diagonal, semi-transparent, highly visible watermark
  page.drawText(watermarkText, {
    x,
    y,
    size: fontSize,
    font: helveticaBold,
    color: rgb(1, 0.25, 0.1), // Colored red/orange
    opacity: 0.4, // Opacity ~0.4
    rotate: degrees(theta), // Rotation 45 degrees
  });
  
  // Save the document and return it as a Buffer
  const pdfBytes = await previewDoc.save();
  return Buffer.from(pdfBytes);
}
