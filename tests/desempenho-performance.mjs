import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://example.test/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.CustomEvent = dom.window.CustomEvent;

const performance = await import('../js/performance.js');

performance.startPerformanceRun({ mode: 'classic', mapSize: 'medium' });
performance.samplePerformanceRun({ score: 10, length: 8, food: 7, force: true });
const result = performance.finishPerformanceRun({ score: 42, length: 20, food: 30, survivedSec: 55 });

assert.equal(result.score, 42);
assert.equal(result.length, 20);
assert.equal(result.food, 30);
assert.equal(result.survivedSec, 55);
assert.ok(result.samples.length >= 2);

const last = performance.loadLastPerformance();
assert.equal(last.score, 42);

const summary = performance.performanceSummary(performance.loadPerformanceHistory());
assert.equal(summary.games, 1);
assert.equal(summary.best, 42);
assert.equal(summary.bestLength, 20);
assert.equal(summary.average, 42);

console.log('RESULTADO: histórico, resumo e registro de desempenho funcionando');
