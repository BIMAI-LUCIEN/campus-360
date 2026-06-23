import fs from 'fs';

const shadowStyles = `
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,`;

function removeBorders(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');

  // Replace full borders, more robust regex
  // Looking for: borderWidth: X, \n borderColor: 'X'
  content = content.replace(/borderWidth:\s*\d+,\s*\n\s*borderColor:\s*'[^']+',/g, shadowStyles.trim() + ',');
  content = content.replace(/borderWidth:\s*\d+,/g, ''); // Delete leftover borderWidth
  
  // Specific cases
  content = content.replace(/borderColor:\s*'[^']+',/g, '');

  fs.writeFileSync(filePath, content, 'utf-8');
}

removeBorders('./App.tsx');
removeBorders('./src/features/pdf/PdfStudentSection.tsx');

console.log('Borders removed with aggressive regex.');
