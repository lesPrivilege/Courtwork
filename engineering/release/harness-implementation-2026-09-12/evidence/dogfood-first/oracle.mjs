import assert from 'node:assert/strict';
import {pageForOffset} from './pagination.mjs';
let count=0;
for(let total=0;total<20;total++)for(let size=1;size<=7;size++)for(let offset=0;offset<=total+2;offset++){assert.equal(pageForOffset(total,size,offset),offset>=total?null:Math.floor(offset/size));count++;}
console.log(JSON.stringify({pass:true,checks:count}));
