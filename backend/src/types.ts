export interface SearchQuery {
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
}