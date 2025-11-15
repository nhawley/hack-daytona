import { chromium } from 'playwright';
import { Car } from './types.js';

export async function scrapeCarGurus(
  maxPrice: number = 30000,
  zipCode: string = '10001'
): Promise<Car[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Build URL
    const url = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?zip=${zipCode}&maxPrice=${maxPrice}&distance=50`;
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for listings
    await page.waitForSelector('[data-cg-ft="car-listing"]', { timeout: 10000 });
    
    // Extract data
    const cars = await page.$$eval('[data-cg-ft="car-listing"]', (elements) => {
      return elements.slice(0, 10).map((el, idx) => {
        const title = el.querySelector('h4')?.textContent?.trim() || '';
        const priceText = el.querySelector('[data-testid="price"]')?.textContent || '0';
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
        const mileageText = el.querySelector('[data-testid="mileage"]')?.textContent || '0';
        const mileage = parseInt(mileageText.replace(/[^0-9]/g, '')) || 0;
        const location = el.querySelector('[data-testid="dealer-location"]')?.textContent?.trim() || '';
        const link = el.querySelector('a')?.href || '';
        const image = el.querySelector('img')?.src || '';
        
        return {
          title,
          price,
          mileage,
          location,
          url: link,
          image,
          source: 'CarGurus'
        };
      });
    });
    
    return cars.filter(car => car.price > 0);
    
  } catch (error) {
    console.error('Scraping error:', error);
    return [];
  } finally {
    await browser.close();
  }
}