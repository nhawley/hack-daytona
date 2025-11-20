import asyncio
import json
from browser_use import Agent
from langchain_anthropic import ChatAnthropic

class CarScraper:
    def __init__(self, api_key):
        self.llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            api_key=api_key
        )
    
    async def scrape_cargurus(self, max_price=30000, zip_code="10001"):
        agent = Agent(
            task=f"""
            Navigate to CarGurus and search for cars with:
            - Maximum price: ${max_price}
            - ZIP code: {zip_code}
            - Distance: 50 miles
            
            Extract the first 10 car listings. For each car, get:
            - title (full name with year, make, model)
            - price (number)
            - mileage (number)
            - location (dealer location)
            - url (listing link)
            - image (image URL)
            
            Return as JSON array.
            """,
            llm=self.llm,
        )
        
        result = await agent.run()
        return self._parse_results(result, 'CarGurus')
    
    async def scrape_autotempest(self, max_price=30000, zip_code="10001"):
        agent = Agent(
            task=f"""
            Go to AutoTempest.com and search for:
            - Max price: ${max_price}
            - ZIP: {zip_code}
            - Radius: 50 miles
            
            Get first 10 listings with:
            - title
            - price
            - mileage
            - location
            - url
            - image
            
            Return JSON array.
            """,
            llm=self.llm,
        )
        
        result = await agent.run()
        return self._parse_results(result, 'AutoTempest')
    
    def _parse_results(self, result, source):
        """Parse and standardize results"""
        try:
            # Try to parse as JSON
            if isinstance(result, str):
                data = json.loads(result)
            else:
                data = result
            
            # Add source to each listing
            if isinstance(data, list):
                for item in data:
                    item['source'] = source
            
            return data
        except:
            return []
    
    async def search_all(self, max_price=30000, zip_code="10001"):
        """Search both sources in parallel"""
        cargurus_task = self.scrape_cargurus(max_price, zip_code)
        autotempest_task = self.scrape_autotempest(max_price, zip_code)
        
        cargurus_results, autotempest_results = await asyncio.gather(
            cargurus_task,
            autotempest_task
        )
        
        all_results = cargurus_results + autotempest_results
        
        # Rank results
        ranked = self._rank_cars(all_results, max_price)
        
        return ranked[:5]  # Return top 5
    
    def _rank_cars(self, cars, max_price):
        """Simple ranking algorithm"""
        for car in cars:
            score = 100
            
            # Price scoring
            if car.get('price'):
                price_ratio = car['price'] / max_price
                score += (1 - price_ratio) * 30
            
            # Mileage scoring
            mileage = car.get('mileage', 100000)
            if mileage < 30000:
                score += 20
            elif mileage < 60000:
                score += 10
            
            car['score'] = score
        
        return sorted(cars, key=lambda x: x.get('score', 0), reverse=True)


# Usage example testing
async def main():
    import os
    
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        print("Please set ANTHROPIC_API_KEY environment variable")
        return
    
    scraper = CarScraper(api_key)
    
    print("🚗 Searching for cars...")
    results = await scraper.search_all(max_price=25000, zip_code="10001")
    
    print(f"\n✅ Found {len(results)} top results:")
    for i, car in enumerate(results, 1):
        print(f"\n#{i} - {car.get('title')}")
        print(f"   Price: ${car.get('price'):,}")
        print(f"   Mileage: {car.get('mileage'):,} mi")
        print(f"   Source: {car.get('source')}")
        print(f"   Score: {car.get('score', 0):.1f}")

if __name__ == "__main__":
    asyncio.run(main())