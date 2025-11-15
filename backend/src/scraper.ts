import { scrapeWithAI } from './aiScraper.js';
import { Car } from './types.js';

export async function scrapeCarGurus(
  maxPrice: number = 30000,
  zipCode: string = '10001'
): Promise<Car[]> {
  const url = `https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?zip=94102&maxPrice=${maxPrice}&distance=50`;
  return scrapeWithAI(url, 'CarGurus');
}