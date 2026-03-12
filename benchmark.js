const { JSDOM } = require('jsdom');
const { performance } = require('perf_hooks');

const dom = new JSDOM(`<!DOCTYPE html><div id="container"></div>`);
const document = dom.window.document;
const container = document.getElementById('container');

const items = Array.from({ length: 1000 }, (_, i) => `Item ${i}`);

function benchmarkDirectAppend() {
    container.innerHTML = '';
    const start = performance.now();
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        container.appendChild(li);
    });
    const end = performance.now();
    return end - start;
}

function benchmarkFragmentAppend() {
    container.innerHTML = '';
    const start = performance.now();
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        fragment.appendChild(li);
    });
    container.appendChild(fragment);
    const end = performance.now();
    return end - start;
}

// Warmup
benchmarkDirectAppend();
benchmarkFragmentAppend();

// Run
let directTotal = 0;
let fragmentTotal = 0;
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
    directTotal += benchmarkDirectAppend();
    fragmentTotal += benchmarkFragmentAppend();
}

console.log(`Direct Append Average: ${directTotal / iterations}ms`);
console.log(`Fragment Append Average: ${fragmentTotal / iterations}ms`);
