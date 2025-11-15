import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import * as Sentry from '@sentry/node';

import { scrapeCarGurus } from './scraper.js'; 
import { scrapeAutoTempest } from './autoTempest.js'; 
import { SearchQuery, Car } from './types.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Sentry init
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV || 'development',
  });
  console.log('Sentry initialized');
} else {
  console.log('Sentry disabled - no DSN provided');
}

app.use(cors());
app.use(express.json());
// app.use(Sentry.Handlers.requestHandler());

// Health check
app.get('/health', (req, res) => {
  console.log('Health check hit');
  res.json({ status: 'ok' });
});

// Search endpoint
app.post('/search', async (req, res) => {
  try {
    const { scenario, maxPrice, zipCode }: SearchQuery = req.body;
    
    const price = maxPrice || extractPrice(scenario) || 30000;
    const zip = zipCode || extractZip(scenario) || '94102';
    
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

// app.listen(PORT, () => {
//   console.log(`🚗 Server running on port ${PORT}`);
// });

const startServer = async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚗 Server running on http://localhost:${PORT}`);
      console.log('Health check: http://localhost:8000/health');
      console.log('Ready to accept requests!');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

// Helper functions
function extractPrice(scenario: string): number | null {
  const match = scenario.match(/\$?([\d,]+)/);
  return match ? parseInt(match[1].replace(/,/g, '')) : null;
}

function extractZip(scenario: string): string | null {
  // const match = scenario.match(/\b(\d{5})\b/);
  return '94102';
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