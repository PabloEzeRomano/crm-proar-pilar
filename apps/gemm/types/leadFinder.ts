export type LeadSearchStatus = 'pending' | 'running' | 'done' | 'error';

export interface LeadSearch {
  id: string;
  company_id: string;
  created_by: string;
  status: LeadSearchStatus;
  query: string;
  location_text: string;
  radius_meters: number;
  min_rating: number | null;
  min_reviews: number | null;
  total_found: number;
  processed: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  painPoints: string[];
  salesOpportunityScore: number;
  recommendedPitch: string;
  recommendedProduct: 'crm' | 'miturno' | 'qrtify';
  tags: string[];
}

export interface PlaceReview {
  author: string;
  rating: number;
  text: string;
  time: string;
}

export interface LeadPlace {
  id: string;
  search_id: string;
  company_id: string;
  google_place_id: string;
  name: string;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  opening_hours: string[] | null;
  reviews: PlaceReview[] | null;
  ai_analysis: AiAnalysis | null;
  prospect_id: string | null;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaceSortKey = 'score' | 'rating' | 'reviews';

export interface PlaceFilters {
  imported: boolean | null;
  hasWebsite: boolean | null;
  hasPhone: boolean | null;
}
