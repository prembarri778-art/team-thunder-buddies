const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    const path = require('path');
    const filePath = 'file://' + path.resolve('index.html');

    await page.goto(filePath, { waitUntil: 'networkidle0' });

    await page.waitForSelector('.btn-primary');

    const result = await page.evaluate(() => {
        const btn = document.querySelector('.btn-primary');

        // Trigger mouseenter first so rect is cached!
        const enterEv = new MouseEvent('mouseenter', { bubbles: true });
        btn.dispatchEvent(enterEv);

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

    console.log("Optimized Benchmark Result:", result);
    await browser.close();
})();
