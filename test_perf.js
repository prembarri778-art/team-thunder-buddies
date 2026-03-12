const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log(msg.text()));
    await page.goto('file://' + __dirname + '/test_perf.html');
    await browser.close();
})();
