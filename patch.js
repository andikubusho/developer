const fs = require('fs');
let content = fs.readFileSync('server/promo_service.ts', 'utf8');

// 1. Change the signature of calculatePromos
content = content.replace(
  'calculatePromos(pelangganId: number, qty: number, nilaiFaktur: number, tglFaktur: Date, merekToken: string, branchId: number, skipDuplicateCheck: boolean = false)',
  'calculatePromos(pelangganId: number, qty: number, nilaiFaktur: number, tglFaktur: Date, merekToken: string, branchId: number, skipDuplicateCheck: boolean = false, clientDb: any = db)'
);

// 2. Identify the start and end of calculatePromos
const lines = content.split('\n');
let inFunc = false;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('export async function calculatePromos')) {
    inFunc = true;
  }
  
  if (inFunc) {
    if (lines[i].includes('{')) braceCount += (lines[i].match(/\{/g) || []).length;
    if (lines[i].includes('}')) braceCount -= (lines[i].match(/\}/g) || []).length;
    
    // Replace 'db.' with 'clientDb.' everywhere except in nested queries if any? Actually 'db.' works
    if (i > 0 && lines[i].includes('db.')) {
      lines[i] = lines[i].replace(/\bdb\./g, 'clientDb.');
    }
    
    if (braceCount === 0 && inFunc) {
      break; // End of function
    }
  }
}

fs.writeFileSync('server/promo_service.ts', lines.join('\n'));
console.log('Patched calculatePromos');
