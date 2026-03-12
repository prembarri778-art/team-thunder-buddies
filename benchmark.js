const N_ELEMENTS = 10000;
const ITERATIONS = 1000;

// Mock DOM
class Element {
    constructor(className) {
        this.className = className;
        this.classList = {
            classes: new Set(),
            add: (c) => this.classList.classes.add(c),
            remove: (c) => this.classList.classes.delete(c),
            contains: (c) => this.classList.classes.has(c)
        };
    }
}

const documentMock = {
    elements: [],
    querySelectorAll: function(selector) {
        if (selector === '.option-card') {
            return this.elements.filter(el => el.className === 'option-card');
        }
        return [];
    }
};

// Setup mock DOM
for (let i = 0; i < N_ELEMENTS; i++) {
    documentMock.elements.push(new Element('other-class'));
}
// Add 4 option cards simulating a question
const options = [
    new Element('option-card'),
    new Element('option-card'),
    new Element('option-card'),
    new Element('option-card')
];
documentMock.elements.push(...options);


// BASELINE Benchmark (O(N) querySelectorAll approach)
console.time('Baseline (querySelectorAll)');
for (let iter = 0; iter < ITERATIONS; iter++) {
    // Simulate clicking each option one by one
    options.forEach(optElem => {
        // The code being benchmarked
        documentMock.querySelectorAll('.option-card').forEach(el => el.classList.remove('selected'));
        optElem.classList.add('selected');
    });
}
console.timeEnd('Baseline (querySelectorAll)');


// OPTIMIZED Benchmark (O(1) variable tracking approach)
console.time('Optimized (Variable tracking)');
let currentSelectedOptionElem = null;
for (let iter = 0; iter < ITERATIONS; iter++) {
    // Simulate clicking each option one by one
    options.forEach(optElem => {
        // The code being benchmarked
        if (currentSelectedOptionElem) {
            currentSelectedOptionElem.classList.remove('selected');
        }
        optElem.classList.add('selected');
        currentSelectedOptionElem = optElem;
    });
}
console.timeEnd('Optimized (Variable tracking)');
