const fs = require('fs');

// We will use Puppeteer to measure performance
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // We need to serve the local files, but we can also just load index.html using file://
    const path = require('path');
    const filePath = 'file://' + path.resolve('index.html');

    await page.goto(filePath, { waitUntil: 'networkidle0' });

    // Wait for the elements to be available
    await page.waitForSelector('.btn-primary');

    // Benchmark function
    const result = await page.evaluate(() => {
        const btn = document.querySelector('.btn-primary');
        const start = performance.now();
        const iterations = 5000;

        for (let i = 0; i < iterations; i++) {
            const ev = new MouseEvent('mousemove', {
                clientX: 100 + (i % 50),
                clientY: 100 + (i % 50),
                bubbles: true
            });
            btn.dispatchEvent(ev);
        }

        const end = performance.now();
        return {
            iterations,
            timeMs: end - start,
            opsPerSec: (iterations / (end - start)) * 1000
        };
    });

    console.log("Benchmark Result:", result);
    await browser.close();
})();
