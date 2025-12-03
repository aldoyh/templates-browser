const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Base URL for the served templates
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
// Delay in milliseconds (6 seconds for proper page rendering)
const WAIT_TIME = 6000;
// Screenshot output directory
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'screenshots');

async function getTemplateDirs() {
    const rootDir = path.join(__dirname, '..');
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    
    // Filter for template directories (those starting with numbers)
    return entries
        .filter(entry => entry.isDirectory() && /^\d+-.+/.test(entry.name))
        .map(entry => entry.name)
        .sort((a, b) => {
            const numA = parseInt(a.split('-')[0]);
            const numB = parseInt(b.split('-')[0]);
            return numA - numB;
        });
}

async function takeScreenshot(browser, templateDir) {
    const page = await browser.newPage();
    
    // Set viewport to common desktop resolution
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Determine the correct URL path
    let url = `${BASE_URL}/${templateDir}/`;
    
    // Check if template has a specific index path
    const specialPaths = {
        '40-metronic-shop-ui': `${BASE_URL}/${templateDir}/theme/shop-index.html`,
        '41-metronic-one-page': `${BASE_URL}/${templateDir}/theme/index.html`,
        '42-navigator-onepage': `${BASE_URL}/${templateDir}/index.html`,
        '43-metronic-one-page': `${BASE_URL}/${templateDir}/theme/`
    };
    
    if (specialPaths[templateDir]) {
        url = specialPaths[templateDir];
    }
    
    console.log(`📸 Taking screenshot of ${templateDir}...`);
    console.log(`   URL: ${url}`);
    
    try {
        // Navigate to the page with timeout
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });
        
        // Wait for 6 seconds to ensure page is fully rendered
        console.log(`   Waiting ${WAIT_TIME}ms for rendering...`);
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME));
        
        // Take screenshot
        const screenshotPath = path.join(SCREENSHOTS_DIR, `${templateDir}.png`);
        await page.screenshot({ 
            path: screenshotPath,
            fullPage: false 
        });
        
        console.log(`   ✅ Screenshot saved: ${screenshotPath}`);
    } catch (error) {
        console.error(`   ❌ Error taking screenshot of ${templateDir}: ${error.message}`);
    } finally {
        await page.close();
    }
}

async function main() {
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(SCREENSHOTS_DIR)) {
        fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    }
    
    const templateDirs = await getTemplateDirs();
    console.log(`Found ${templateDirs.length} templates to screenshot\n`);
    
    // Launch browser
    const browser = await puppeteer.launch({
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-web-security'
        ]
    });
    
    try {
        for (const templateDir of templateDirs) {
            await takeScreenshot(browser, templateDir);
        }
    } finally {
        await browser.close();
    }
    
    console.log('\n🎉 All screenshots completed!');
}

main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
