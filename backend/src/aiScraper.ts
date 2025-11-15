import dotenv from 'dotenv';
import { chromium } from 'playwright';
import Anthropic from '@anthropic-ai/sdk';
import { Car } from './types.js';

dotenv.config();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function scrapeWithAI(
  url: string,
  source: string
): Promise<Car[]> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Get page HTML
    const html = await page.content();
    
    // Ask Claude to extract car data
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Extract car listings from this HTML. Return ONLY a JSON array with: title, price (number), mileage (number), location, url, image. First 10 listings only.

HTML:
${html.substring(0, 50000)}`
      }]
    });
    
    // Handle different content block types
    const textBlock = message.content.find(block => block.type === 'text');
    
    if (!textBlock || textBlock.type !== 'text') {
      console.error('No text content in response');
      return [];
    }
    
    const response = textBlock.text;
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      const cars = JSON.parse(jsonMatch[0]);
      return cars.map((car: any) => ({
        ...car,
        source
      }));
    }
    
    return [];
    
  } catch (error) {
    console.error('AI scraping error:', error);
    return [];
  } finally {
    await browser.close();
  }
}