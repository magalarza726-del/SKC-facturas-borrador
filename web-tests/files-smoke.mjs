import assert from 'node:assert/strict';
import {prepareFileRecords,evidenceMime} from '../docs/assets/files.js';

assert.equal(evidenceMime(new File(['x'],'foto.JPG',{type:''})),'image/jpeg');
const records=await prepareFileRecords([new File(['pdf-data'],'factura.pdf',{type:'application/pdf'})]);
assert.equal(records.length,1);assert.equal(records[0].mime,'application/pdf');assert.equal(records[0].sha256.length,64);
await assert.rejects(()=>prepareFileRecords([new File(['<svg/>'],'vector.svg',{type:'image/svg+xml'})]),/no es un PDF/i);
await assert.rejects(()=>prepareFileRecords([new File([],'vacio.pdf',{type:'application/pdf'})]),/vacío/i);
console.log('FILES SMOKE OK');
