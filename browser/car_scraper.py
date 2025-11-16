#!/usr/bin/env python3
"""
Car Scraper using Playwright + Anthropic API
Simple implementation for auto broker
"""

import asyncio
import json
import os
from playwright.async_api import async_playwright
from anthropic import Anthropic


class CarScraper:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('ANTHROPIC_API_KEY')
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")
        
        self.client = Anthropic(api_key=self.api_key)
    
    async def scrape_cargurus(self, max_price=30000, zip_code="10001"):
        """Scrape CarGurus for car listings"""
        print(f"🚗 Searching CarGurus: ${max_price} near {zip_code}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            try:
                # Navigate to CarGurus
                url = f"https://www.cargurus.com/Cars/inventorylisting/viewDetailsFilterViewInventoryListing.action?zip={zip_code}&maxPrice={max_price}&distance=50"
                print(f"📍 Navigating to: {url}")
                
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(3000)
                
                # Take screenshot
                screenshot_path = f"./cargurus_{zip_code}_{max_price}.png"
                await page.screenshot(path=screenshot_path, full_page=True)
                print(f"📸 Screenshot saved: {screenshot_path}")
                
                # Get page content
                content = await page.content()
                
                await browser.close()
                
                # Use Claude API directly to extract data
                print("🤖 Asking Claude to extract car data...")
                message = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    messages=[{
                        "role": "user",
                        "content": f"""Extract car listings from this CarGurus HTML content.

Find up to 10 car listings and extract:
- title: Full car name (year, make, model)
- price: Price as integer (no symbols)
- mileage: Mileage as integer
- location: Dealer location
- url: Listing URL (if available)
- image: Image URL (if available)

Return ONLY a valid JSON array with this structure:
[{{"title": "2020 Honda CR-V", "price": 28500, "mileage": 35000, "location": "New York, NY", "url": "https://...", "image": "https://..."}}]

HTML (first 40000 chars):
{content[:40000]}
"""
                    }]
                )
                
                result = message.content[0].text
                cars = self._parse_results(result, 'CarGurus')
                print(f"✅ Found {len(cars)} cars from CarGurus")
                return cars
                
            except Exception as e:
                print(f"❌ CarGurus error: {e}")
                try:
                    screenshot_path = f"./cargurus_error_{zip_code}.png"
                    await page.screenshot(path=screenshot_path, full_page=True)
                    print(f"📸 Error screenshot: {screenshot_path}")
                except:
                    pass
                try:
                    await browser.close()
                except:
                    pass
                return []
    
    async def scrape_autotempest(self, max_price=30000, zip_code="10001"):
        """Scrape AutoTempest for car listings"""
        print(f"🔍 Searching AutoTempest: ${max_price} near {zip_code}")
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context()
            page = await context.new_page()
            
            try:
                # Navigate to AutoTempest
                url = f"https://www.autotempest.com/results?maxprice={max_price}&zip={zip_code}&radius=50"
                print(f"📍 Navigating to: {url}")
                
                await page.goto(url, timeout=30000)
                await page.wait_for_timeout(3000)
                
                # Take screenshot
                screenshot_path = f"./autotempest_{zip_code}_{max_price}.png"
                await page.screenshot(path=screenshot_path, full_page=True)
                print(f"📸 Screenshot saved: {screenshot_path}")
                
                # Get page content
                content = await page.content()
                
                await browser.close()
                
                # Use Claude API directly
                print("🤖 Asking Claude to extract car data...")
                message = self.client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=4096,
                    messages=[{
                        "role": "user",
                        "content": f"""Extract car listings from this AutoTempest HTML.

Find up to 10 listings and extract:
- title: Complete car title
- price: Price as integer
- mileage: Mileage as integer  
- location: Location text
- url: Listing URL
- image: Image URL

Return ONLY valid JSON array:
[{{"title": "...", "price": 25000, "mileage": 50000, "location": "...", "url": "...", "image": "..."}}]

HTML (first 40000 chars):
{content[:40000]}
"""
                    }]
                )
                
                result = message.content[0].text
                cars = self._parse_results(result, 'AutoTempest')
                print(f"✅ Found {len(cars)} cars from AutoTempest")
                return cars
                
            except Exception as e:
                print(f"❌ AutoTempest error: {e}")
                try:
                    screenshot_path = f"./autotempest_error_{zip_code}.png"
                    await page.screenshot(path=screenshot_path, full_page=True)
                    print(f"📸 Error screenshot: {screenshot_path}")
                except:
                    pass
                try:
                    await browser.close()
                except:
                    pass
                return []
    
    def _parse_results(self, result, source):
        """Parse and standardize results from agent"""
        try:
            # Handle string result
            if isinstance(result, str):
                # Try to extract JSON from markdown code blocks
                if '```json' in result:
                    json_str = result.split('```json')[1].split('```')[0].strip()
                elif '```' in result:
                    json_str = result.split('```')[1].split('```')[0].strip()
                else:
                    json_str = result
                
                data = json.loads(json_str)
            else:
                data = result
            
            # Ensure it's a list
            if not isinstance(data, list):
                data = [data]
            
            # Add source and validate fields
            cars = []
            for item in data:
                if isinstance(item, dict):
                    car = {
                        'title': item.get('title', ''),
                        'price': int(item.get('price', 0)),
                        'mileage': int(item.get('mileage', 0)),
                        'location': item.get('location', ''),
                        'url': item.get('url', ''),
                        'image': item.get('image', ''),
                        'source': source
                    }
                    cars.append(car)
            
            return cars
        
        except Exception as e:
            print(f"⚠️  Parse error for {source}: {e}")
            return []
    
    async def search_all(self, max_price=30000, zip_code="10001"):
        """Search both sources in parallel and return top 5"""
        print("=" * 60)
        print(f"🚀 Starting parallel search for ${max_price} near {zip_code}")
        print("=" * 60)
        
        # Run both scrapers in parallel
        results = await asyncio.gather(
            self.scrape_cargurus(max_price, zip_code),
            self.scrape_autotempest(max_price, zip_code),
            return_exceptions=True
        )
        
        # Combine results
        all_cars = []
        for result in results:
            if isinstance(result, list):
                all_cars.extend(result)
        
        print(f"\n📊 Total cars found: {len(all_cars)}")
        
        # Rank and get top 5
        ranked = self._rank_cars(all_cars, max_price)
        top_5 = ranked[:5]
        
        return top_5
    
    def _rank_cars(self, cars, max_price):
        """Rank cars based on price and mileage"""
        for car in cars:
            score = 100
            
            # Price scoring (prefer lower prices within budget)
            if car['price'] > 0:
                price_ratio = car['price'] / max_price
                if price_ratio <= 1:
                    score += (1 - price_ratio) * 30  # Bonus for under budget
                else:
                    score -= 50  # Penalty for over budget
            
            # Mileage scoring (prefer lower mileage)
            mileage = car['mileage']
            if mileage < 30000:
                score += 20
            elif mileage < 60000:
                score += 10
            elif mileage < 100000:
                score += 5
            
            # Source diversity bonus
            if car['source'] == 'CarGurus':
                score += 5
            
            car['score'] = round(score, 1)
        
        # Sort by score descending
        return sorted(cars, key=lambda x: x.get('score', 0), reverse=True)


async def main():
    """Main function - example usage"""
    
    # Check for API key
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("❌ ERROR: ANTHROPIC_API_KEY environment variable not set!")
        print("\nPlease set it with:")
        print("  export ANTHROPIC_API_KEY='sk-ant-your-key-here'")
        return
    
    # Create scraper
    scraper = CarScraper(api_key)
    
    # Search for cars
    max_price = 25000
    zip_code = "10001"
    
    results = await scraper.search_all(max_price, zip_code)
    
    # Display results
    print("\n" + "=" * 60)
    print(f"🏆 TOP 5 CARS")
    print("=" * 60)
    
    for i, car in enumerate(results, 1):
        print(f"\n#{i} - {car['title']}")
        print(f"   💰 Price: ${car['price']:,}")
        print(f"   📏 Mileage: {car['mileage']:,} mi")
        print(f"   📍 Location: {car['location']}")
        print(f"   🌐 Source: {car['source']}")
        print(f"   ⭐ Score: {car['score']}")
        print(f"   🔗 URL: {car['url'][:60]}...")
    
    print("\n" + "=" * 60)
    
    # Return as JSON for API usage
    return {
        'results': results,
        'total': len(results),
        'criteria': {
            'maxPrice': max_price,
            'zipCode': zip_code
        }
    }


if __name__ == "__main__":
    # Run the async main function
    result = asyncio.run(main())
    
    # Optionally print JSON
    if result:
        print("\n📋 JSON Output:")
        print(json.dumps(result, indent=2))