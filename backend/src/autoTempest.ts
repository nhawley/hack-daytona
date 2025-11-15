import { chromium } from 'playwright';
import { Car } from './types.js';

export async function scrapeAutoTempest(
  maxPrice: number = 30000,
  zipCode: string = '10001'
): Promise<Car[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const url = `https://www.autotempest.com/results?maxprice=${maxPrice}&zip=${zipCode}&radius=50`;
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('.result-item, .listing', { timeout: 10000 });
    
    const cars = await page.$$eval('.result-item, .listing', (elements) => {
      return elements.slice(0, 10).map(el => {
        const title = el.querySelector('.title, h3')?.textContent?.trim() || '';
        const priceText = el.querySelector('.price')?.textContent || '0';
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
        const details = el.querySelector('.details')?.textContent || '';
        const mileageMatch = details.match(/([\d,]+)\s*mi/);
        const mileage = mileageMatch ? parseInt(mileageMatch[1].replace(/,/g, '')) : 0;
        const link = el.querySelector('a')?.href || '';
        const image = el.querySelector('img')?.src || '';
        
        return {
          title,
          price,
          mileage,
          location: details,
          url: link,
          image,
          source: 'AutoTempest'
        };
      });
    });
    
    return cars.filter(car => car.price > 0);
    
  } catch (error) {
    console.error('AutoTempest scraping error:', error);
    return [];
  } finally {
    await browser.close();
  }
}