import { scrapeWithAI } from './aiScraper.js';
import { Car } from './types.js';

export async function scrapeAutoTempest(
  maxPrice: number = 30000,
  zipCode: string = '10001'
): Promise<Car[]> {
  const url = `https://www.autotempest.com/results?maxprice=${maxPrice}&zip=${zipCode}&radius=50`;
  return scrapeWithAI(url, 'AutoTempest');
}