import { cekAmbangRisiko } from '../controllers/PeringatanSMSController.js';

const idPetak = Number(process.argv[2] ?? 214);
await cekAmbangRisiko([{ idPetak: idPetak, tingkatRisiko: 'tinggi' }]);
console.log('selesai');
process.exit(0);