const fs = require('fs');

const files = [
  'client/src/pages/promo/MasterPromoIntegrated.tsx',
  'client/src/pages/promo/TransaksiIntegrated.tsx',
  'client/src/pages/promo/PencairanIntegrated.tsx'
];

for (const f of files) {
  let content = fs.readFileSync(f, 'utf8');

  // Replace type=\"date\" with type=\"text\" placeholder=\"DD/MM/YYYY\" maxLength={10}
  content = content.replace(/type=\"date\"/g, 'type=\"text\" placeholder=\"DD/MM/YYYY\" maxLength={10}');

  // Replace \"yyyy-MM-dd\" with \"dd/MM/yyyy\"
  content = content.replace(/\"yyyy-MM-dd\"/g, '\"dd/MM/yyyy\"');
  
  // Add import for utils if needed
  if(!content.includes('parseIndonesiaDate')) {
    content = content.replace(/import \{ cn, safeFormat \} from \"@\/lib\/utils\";/, 'import { cn, safeFormat, parseIndonesiaDate, formatIndonesiaDate } from \"@/lib/utils\";');
  }

  // MasterPromo: map mutations to parseIndonesiaDate
  if (f.includes('MasterPromoIntegrated.tsx')) {
    content = content.replace(/(mutPaket\.mutate\(\{\.\.\.newPaket, tiers)(?!\,\s*startDate)/g, 'mutPaket.mutate({...newPaket, startDate: parseIndonesiaDate(newPaket.startDate), endDate: parseIndonesiaDate(newPaket.endDate), tiers');
    
    content = content.replace(/(mutCashback\.mutate\(newCashback\))/g, 'mutCashback.mutate({...newCashback, masaBerlakuMulai: parseIndonesiaDate(newCashback.masaBerlakuMulai), masaBerlakuSelesai: parseIndonesiaDate(newCashback.masaBerlakuSelesai)})');
    
    content = content.replace(/(mutPoint\.mutate\(\{ \.\.\.newPoint, rules: pointRules, rewards: pointRewards \}\))/g, 'mutPoint.mutate({ ...newPoint, tanggalMulai: parseIndonesiaDate(newPoint.tanggalMulai), tanggalSelesai: parseIndonesiaDate(newPoint.tanggalSelesai), rules: pointRules, rewards: pointRewards })');
    
    content = content.replace(/(mutPrincipalProgram\.mutate\(\{ \.\.\.newPrincipal, tiers: principalTiers \}\))/g, 'mutPrincipalProgram.mutate({ ...newPrincipal, startDate: parseIndonesiaDate(newPrincipal.startDate), endDate: parseIndonesiaDate(newPrincipal.endDate), tiers: principalTiers })');
  }
  
  // TransaksiIntegrated: tglFaktur mutation mapping
  if (f.includes('TransaksiIntegrated.tsx')) {
    content = content.replace(/mutSimpanForm\.mutate\(\{ \.\.\.formItem, tglFaktur \}/g, 'mutSimpanForm.mutate({ ...formItem, tglFaktur: parseIndonesiaDate(tglFaktur) }');
  }

  // PencairanIntegrated: tanggalCair mutation mapping
  if (f.includes('PencairanIntegrated.tsx')) {
    content = content.replace(/mutProsesKlaim\.mutate\(\{ status, date: tanggalCair, note: notesPencairan \}\)/g, 'mutProsesKlaim.mutate({ status, date: parseIndonesiaDate(tanggalCair), note: notesPencairan })');
  }

  fs.writeFileSync(f, content);
  console.log('Updated ' + f);
}
