import assert from 'node:assert/strict';
import {createZipBlob} from '../docs/assets/zip.js';

const zip=await createZipBlob([
  {name:'SKC-TEST_01.jpg',data:new Blob([new Uint8Array([1,2,3])],{type:'image/jpeg'})},
  {name:'SKC-TEST_02.pdf',data:new Blob([new TextEncoder().encode('%PDF-test')],{type:'application/pdf'})}
]);
const bytes=new Uint8Array(await zip.arrayBuffer());
assert.equal(zip.type,'application/zip');
assert.ok(bytes.length>50);
assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
console.log('EVIDENCE ZIP SMOKE OK',{bytes:bytes.length});
