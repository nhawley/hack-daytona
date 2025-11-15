import React, { useState } from 'react';
import { searchCars, Car } from './api';
import './App.css';

function App() {
  const [scenario, setScenario] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Car[]>([]);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const data = await searchCars({ scenario });
      setResults(data.results || []);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🚗 Auto Broker AI</h1>
        <p>Find your perfect car in seconds</p>
      </header>

      <main className="container">
        <form onSubmit={handleSearch} className="search-form">
          <textarea
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            placeholder="Describe what you need: e.g., family SUV under $30,000 near 94102"
            rows={3}
            required
          />
          <button type="submit" disabled={loading || !scenario.trim()}>
            {loading ? 'Searching...' : 'Find My Car'}
          </button>
        </form>

        {error && <div className="error">{error}</div>}

        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Searching across multiple platforms...</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="results">
            <h2>Top 5 Matches</h2>
            <div className="grid">
              {results.map((car, idx) => (
                <div key={idx} className="card">
                  <div className="rank">#{idx + 1}</div>
                  {car.image && <img src={car.image} alt={car.title} />}
                  <div className="card-content">
                    <h3>{car.title}</h3>
                    <div className="details">
                      <p className="price">${car.price.toLocaleString()}</p>
                      <p>{car.mileage.toLocaleString()} mi</p>
                      <p className="location">{car.location}</p>
                      <p className="source">{car.source}</p>
                    </div>
                    <a 
                      href={car.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-btn"
                    >
                      View Listing →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;