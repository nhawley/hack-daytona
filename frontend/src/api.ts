import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface SearchRequest {
  scenario: string;
  maxPrice?: number;
  zipCode?: string;
}

export interface Car {
  title: string;
  price: number;
  mileage: number;
  location: string;
  url: string;
  image?: string;
  source: string;
  score?: number;
}

export const searchCars = async (query: SearchRequest) => {
  const response = await axios.post(`${API_URL}/search`, query);
  return response.data;
};