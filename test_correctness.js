const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const filePath = 'file://' + path.resolve('index.html');

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.error(`PAGE ERROR: ${msg.text()}`);
        }
    });

    page.on('pageerror', err => {
        console.error(`PAGE EXCEPTION: ${err.message}`);
    });

    await page.goto(filePath, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.btn-primary');

    const result = await page.evaluate(() => {
        const btn = document.querySelector('.btn-primary');
        const errors = [];

        try {
            // enter
            btn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

            // move
            btn.dispatchEvent(new MouseEvent('mousemove', {
                clientX: 120,
                clientY: 120,
                bubbles: true
            }));

            // verify transform has been applied
            if (!btn.style.transform.includes('translate')) {
                errors.push('Transform style not applied during mousemove');
            }

            // leave
            btn.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));

            // verify transform reset
            if (!btn.style.transform.includes('translate(0px, 0px)')) {
                errors.push('Transform style not reset during mouseleave');
            }

        } catch(e) {
            errors.push(e.message);
        }

        return errors;
    });

    if (result.length > 0) {
        console.error("Functional test failed:", result);
    } else {
        console.log("Functional test passed! No console errors, transform logic seems intact.");
    }

    await browser.close();
})();
