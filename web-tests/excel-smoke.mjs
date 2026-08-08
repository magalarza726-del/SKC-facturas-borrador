import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {buildXlsxBlob} from '../docs/assets/excel-writer.js';
import {OFFICIAL_EXCEL_HEADERS,isoWeek,transactionToOfficialRow} from '../docs/assets/excel-official.js';

assert.equal(isoWeek('2026-08-07'),32);
const row=transactionToOfficialRow({purchaseDate:'2026-08-07',movementType:'Gasto',amount:12.5,description:'Material eléctrico',project:'Proyecto X',costCenter:'Servicios',secondaryCost:'Insumos proyectos',client:'Cliente',invoiceNumber:'F-001',accountUsername:'Javier',evidenceStatus:'Comprobante adjunto',observations:'Prueba'},'PROYECTOS');
assert.equal(row.length,17);assert.equal(row[13],12.5);assert.equal(row[12],null);assert.equal(row[2],32);assert.equal(row[3],'agosto');
const foodRow=transactionToOfficialRow({purchaseDate:'2026-07-07',movementType:'Gasto',amount:1.5,description:'REFRIGERIO',project:'Proyecto X',accountUsername:'Dalton'},'PROYECTOS');
assert.equal(foodRow[5],'Alim');
const blob=buildXlsxBlob({sheetName:'REGISTRO',headers:OFFICIAL_EXCEL_HEADERS,rows:[row,foodRow],widths:Array(17).fill(15),dateColumns:[0],currencyColumns:[12,13]});
const bytes=new Uint8Array(await blob.arrayBuffer());
assert.equal(String.fromCharCode(...bytes.slice(0,2)),'PK');
await writeFile(new URL('./.tmp-official.xlsx',import.meta.url),bytes);
console.log('EXCEL WRITER SMOKE OK',{bytes:bytes.length,columns:row.length});
