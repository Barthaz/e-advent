import test from 'node:test';
import assert from 'node:assert/strict';
import {readProgress,saveProgress} from '../public/assets/js/progress.mjs';
test('malformed or blocked storage does not stop the calendar',()=>{
 assert.deepEqual([...readProgress(null)],[]);assert.deepEqual([...readProgress({getItem(){return '{bad';}})],[]);
 assert.equal(saveProgress(null,new Set([1])),false);
});
test('history contains only unique valid day numbers',()=>{
 assert.deepEqual([...readProgress({getItem(){return JSON.stringify({openedDays:[1,1,3,24,25,0,-1,'2',null]});}})],[1,3,24]);
});
