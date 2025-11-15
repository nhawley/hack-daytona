import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';

import { SearchQuery, Car } from './types.ts';
import { scrapeCarGurus } from './scraper.ts';
import { scrapeAutoTempest } from './autoTempest.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Sentry init
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  sendDefaultPii: true,
});

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
// app.use(Sentry.Handlers.requestHandler());

// Search endpoint
app.post('/search', async (req, res) => {
  try {
    const { scenario, maxPrice, zipCode }: SearchQuery = req.body;
    
    const price = maxPrice || extractPrice(scenario) || 30000;
    const zip = zipCode || extractZip(scenario) || '10001';
    
    console.log(`Searching both sources: $${price} near ${zip}`);
    
    // Scrape both sources in parallel
    const [carGurusCars, autoTempestCars] = await Promise.all([
      scrapeCarGurus(price, zip),
      scrapeAutoTempest(price, zip)
    ]);
    
    const allCars = [...carGurusCars, ...autoTempestCars];
    const ranked = rankCars(allCars, price);
    const top5 = ranked.slice(0, 5);
    
    res.json({
      results: top5,
      total: allCars.length,
      criteria: { maxPrice: price, zipCode: zip }
    });
    
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).json({ error: 'Search failed' });
  }
});

Sentry.setupExpressErrorHandler(app);

app.listen(PORT, () => {
  console.log(`🚗 Server running on port ${PORT}`);
});

// Helper functions
function extractPrice(scenario: string): number | null {
  const match = scenario.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

function extractZip(scenario: string): string | null {
  const match = scenario.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

function rankCars(cars: Car[], maxPrice: number): Car[] {
  return cars
    .map(car => ({
      ...car,
      score: calculateScore(car, maxPrice)
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

function calculateScore(car: Car, maxPrice: number): number {
  let score = 100;
  
  // Price scoring (prefer lower prices)
  const priceRatio = car.price / maxPrice;
  score += (1 - priceRatio) * 30;
  
  // Mileage scoring (prefer lower mileage)
  if (car.mileage < 30000) score += 20;
  else if (car.mileage < 60000) score += 10;
  
  return Math.max(0, score);
}