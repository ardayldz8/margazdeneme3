import puppeteer from 'puppeteer';
import prisma from '../lib/prisma';
import axios from 'axios';
import fs from 'fs';


export class EpdkService {
    async syncDealers() {
        console.log('Starting sync process...');
        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
        await page.setUserAgent(userAgent);

        try {
            console.log('Navigating to EPDK...');
            // Clear cookies to ensure fresh session
            const client = await page.target().createCDPSession();
            await client.send('Network.clearBrowserCookies');

            await page.goto('https://lisans.epdk.gov.tr/epvys-web/faces/pages/lisans/lpgOtogazBayilik/lpgOtogazBayilikOzetSorgula.xhtml');

            // Select "MARGAZ" from "Dağıtım Şirketi" dropdown
            console.log('Selecting Margaz...');
            await page.evaluate(() => {
                // @ts-ignore
                const dropdown = PF('widget_lpgOtoBayilikOzetForm_j_idt45');
                if (dropdown) {
                    dropdown.selectValue('31899');
                } else {
                    // Fallback
                    const trigger = document.querySelector('#lpgOtoBayilikOzetForm\\:j_idt45 .ui-selectonemenu-trigger');
                    if (trigger) (trigger as HTMLElement).click();

                    const select = document.getElementById('lpgOtoBayilikOzetForm:j_idt45_input') as HTMLSelectElement;
                    if (select) {
                        select.value = '31899';
                        const event = new Event('change', { bubbles: true });
                        select.dispatchEvent(event);
                    }
                }
            });
            // Wait for AJAX update - Increased to 8s for safety
            await new Promise(r => setTimeout(r, 8000));

            // --- Anti-Captcha Logic ---
            console.log('Looking for reCAPTCHA...');

            let siteKey = null;

            try {
                // Try finding the iframe first (common for v2)
                const frameElement = await page.waitForSelector('iframe[src*="recaptcha"]', { timeout: 10000 });
                if (frameElement) {
                    const src = await frameElement.evaluate(el => el.getAttribute('src'));
                    if (src) {
                        const url = new URL(src);
                        siteKey = url.searchParams.get('k');
                    }
                }
            } catch (e) {
                console.log('reCAPTCHA iframe not found, checking .g-recaptcha class...');
            }

            if (!siteKey) {
                // Fallback to .g-recaptcha element
                siteKey = await page.evaluate(() => {
                    // @ts-ignore
                    const element = document.querySelector('.g-recaptcha');
                    return element ? element.getAttribute('data-sitekey') : null;
                });
            }

            if (!siteKey) {
                console.log('Site key not found. Taking snapshot...');
                await page.screenshot({ path: 'debug_no_captcha.png' });
                const html = await page.content();
                fs.writeFileSync('debug_page.html', html);
                throw new Error('Site key not found!');
            }

            console.log('Site Key found:', siteKey);
            console.log('Sending task to Anti-Captcha...');

            const createTaskResponse = await axios.post('https://api.anti-captcha.com/createTask', {
                clientKey: process.env.ANTI_CAPTCHA_KEY,
                task: {
                    type: 'RecaptchaV2TaskProxyless',
                    websiteURL: page.url(),
                    websiteKey: siteKey,
                    userAgent: userAgent
                }
            });

            if (createTaskResponse.data.errorId !== 0) {
                throw new Error(`Anti-Captcha Error: ${createTaskResponse.data.errorDescription}`);
            }

            const taskId = createTaskResponse.data.taskId;
            console.log(`Task created! ID: ${taskId}. Waiting for solution...`);

            let solution = null;
            let attempts = 0;
            while (attempts < 60) { // Wait up to 120 seconds
                await new Promise(r => setTimeout(r, 2000));
                const resultResponse = await axios.post('https://api.anti-captcha.com/getTaskResult', {
                    clientKey: process.env.ANTI_CAPTCHA_KEY,
                    taskId: taskId
                });

                if (resultResponse.data.status === 'ready') {
                    solution = resultResponse.data.solution.gRecaptchaResponse;
                    console.log('CAPTCHA Solved!');
                    break;
                }
                if (resultResponse.data.errorId !== 0) {
                    throw new Error(`Anti-Captcha Error: ${resultResponse.data.errorDescription}`);
                }
                attempts++;
            }

            if (!solution) {
                throw new Error('CAPTCHA solution timeout.');
            }

            // Inject Solution
            await page.evaluate((token) => {
                // 1. Set the textarea value (standard method)
                const textarea = document.querySelector('textarea[name="g-recaptcha-response"]');
                if (textarea) {
                    textarea.innerHTML = token;
                    // @ts-ignore
                    textarea.value = token;
                }

                // 2. Set the element by ID if it exists
                const elById = document.getElementById('g-recaptcha-response');
                if (elById) {
                    elById.innerHTML = token;
                    // @ts-ignore
                    elById.value = token;
                }

                // 3. Trigger Callback
                // @ts-ignore
                const element = document.querySelector('.g-recaptcha');
                // @ts-ignore
                const callback = element?.getAttribute('data-callback');
                if (callback && (window as any)[callback]) {
                    console.log(`Calling callback: ${callback}`);
                    // @ts-ignore
                    (window as any)[callback](token);
                }
            }, solution);

            console.log('Solution injected.');
            await page.screenshot({ path: 'debug_after_inject.png' });

            // Click "Sorgula" button
            console.log('Clicking query button...');
            await new Promise(r => setTimeout(r, 1000)); // Random delay
            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const queryBtn = buttons.find(b => b.innerText.includes('Sorgula'));
                if (queryBtn) {
                    // @ts-ignore
                    queryBtn.click();
                } else {
                    console.error('Sorgula button not found!');
                }
            });

            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({ path: 'debug_after_click.png' });
            const htmlAfterClick = await page.content();
            fs.writeFileSync('debug_page_after_click.html', htmlAfterClick);

            // --- Pagination Logic ---
            console.log('Waiting for data to load...');
            const startTime = Date.now();
            let firstPageDetected = false;

            while (Date.now() - startTime < 120000) {
                const rowCount = await page.evaluate(() => {
                    const rows = document.querySelectorAll('.ui-datatable-data tr');
                    if (rows.length === 1 && rows[0].classList.contains('ui-datatable-empty-message')) return 0;
                    return rows.length;
                });

                if (rowCount > 0) {
                    firstPageDetected = true;
                    break;
                }
                await new Promise(r => setTimeout(r, 2000));
            }

            if (!firstPageDetected) {
                console.log('Timeout or no data found.');
                return { success: false, message: 'No data found or timeout' };
            }

            console.log('Data detected! Starting pagination...');
            let allDealers: any[] = [];
            let lastPageDealers: any[] = [];
            let hasNextPage = true;
            let pageNum = 1;

            while (hasNextPage) {
                console.log(`Extracting page ${pageNum}...`);

                // Give a buffer for table to fully render
                await new Promise(r => setTimeout(r, 2000));

                // Extract data from current page
                const pageDealers = await page.evaluate(() => {
                    const rows = Array.from(document.querySelectorAll('.ui-datatable-data tr'));
                    return rows.map(row => {
                        const cells = Array.from(row.querySelectorAll('td'));
                        if (cells.length < 5) return null;

                        return {
                            status: cells[0]?.innerText?.trim(),
                            licenseNo: cells[1]?.innerText?.trim(),
                            title: cells[2]?.innerText?.trim(),
                            taxNo: cells[3]?.innerText?.trim(),
                            startDate: cells[4]?.innerText?.trim(),
                            endDate: cells[5]?.innerText?.trim(),
                            decisionNo: cells[6]?.innerText?.trim(),
                            address: cells[7]?.innerText?.trim(),
                            district: cells[8]?.innerText?.trim(),
                            city: cells[9]?.innerText?.trim(),
                            documentNo: cells[10]?.innerText?.trim(),
                            distributor: cells[11]?.innerText?.trim(),
                            contractStartDate: cells[12]?.innerText?.trim(),
                            contractEndDate: cells[13]?.innerText?.trim()
                        };
                    }).filter(d => d && d.licenseNo);
                });

                // Check for duplicates (compare with previous page)
                const isDuplicate = lastPageDealers.length > 0 &&
                    JSON.stringify(pageDealers) === JSON.stringify(lastPageDealers);

                if (isDuplicate) {
                    console.log('Duplicate data detected (pagination failed to advance). Stopping.');
                    hasNextPage = false;
                    break;
                }

                allDealers = [...allDealers, ...pageDealers];
                lastPageDealers = pageDealers;
                console.log(`Extracted ${pageDealers.length} records from page ${pageNum}. Total: ${allDealers.length}`);

                // Check for next page button
                const nextButtonState = await page.evaluate(() => {
                    const nextBtn = document.querySelector('.ui-paginator-next');
                    if (!nextBtn) return 'not-found';
                    if (nextBtn.classList.contains('ui-state-disabled')) return 'disabled';
                    if (nextBtn.getAttribute('aria-disabled') === 'true') return 'disabled';
                    return 'enabled';
                });

                if (nextButtonState === 'enabled' && pageNum < 50) {
                    console.log('Clicking next page...');
                    // Use evaluate for more reliable clicking
                    await page.evaluate(() => {
                        const nextBtn = document.querySelector('.ui-paginator-next') as HTMLElement;
                        if (nextBtn) nextBtn.click();
                    });

                    // Wait for table update (loading overlay usually appears)
                    await new Promise(r => setTimeout(r, 5000));
                    pageNum++;
                } else {
                    console.log(`Stopping pagination. Reason: Next button is ${nextButtonState}`);
                    hasNextPage = false;
                }
            }

            console.log(`Total extracted: ${allDealers.length} dealers.`);

            // Save to database
            for (const dealer of allDealers) {
                if (!dealer) continue;

                // Helper to parse date DD/MM/YYYY or DD.MM.YYYY
                const parseDate = (dateStr: string) => {
                    if (!dateStr) return null;
                    // Replace dots with slashes to standardize
                    const cleanDate = dateStr.replace(/\./g, '/');
                    const parts = cleanDate.split('/');
                    if (parts.length === 3) {
                        // Create date object (Month is 0-indexed in JS Date, but YYYY-MM-DD works with 1-indexed)
                        // Using ISO format YYYY-MM-DD for Prisma
                        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                    return null;
                };

                // Log raw dates for debugging
                if (dealer.startDate || dealer.endDate) {
                    console.log(`Raw Dates for ${dealer.licenseNo}: Start=${dealer.startDate}, End=${dealer.endDate}`);
                }

                await prisma.dealer.upsert({
                    where: { licenseNo: dealer.licenseNo },
                    update: {
                        title: dealer.title,
                        city: dealer.city,
                        district: dealer.district,
                        address: dealer.address,
                        status: dealer.status,
                        distributor: dealer.distributor,
                        taxNo: dealer.taxNo,
                        decisionNo: dealer.decisionNo,
                        documentNo: dealer.documentNo,
                        startDate: parseDate(dealer.startDate),
                        endDate: parseDate(dealer.endDate),
                        contractStartDate: parseDate(dealer.contractStartDate),
                        contractEndDate: parseDate(dealer.contractEndDate),
                        updatedAt: new Date()
                    },
                    create: {
                        licenseNo: dealer.licenseNo,
                        title: dealer.title || 'Unknown',
                        city: dealer.city,
                        district: dealer.district,
                        address: dealer.address,
                        status: dealer.status,
                        distributor: dealer.distributor,
                        taxNo: dealer.taxNo,
                        decisionNo: dealer.decisionNo,
                        documentNo: dealer.documentNo,
                        startDate: parseDate(dealer.startDate),
                        endDate: parseDate(dealer.endDate),
                        contractStartDate: parseDate(dealer.contractStartDate),
                        contractEndDate: parseDate(dealer.contractEndDate)
                    }
                });
            }

            return { success: true, count: allDealers.length };

        } catch (error) {
            console.error('Sync error:', error);
            throw error;
        } finally {
            // Keep browser open for a few seconds to show success state to user
            await new Promise(r => setTimeout(r, 3000));
            await browser.close();
        }
    }
}
