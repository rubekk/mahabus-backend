import { TripFilters } from '@/types';

interface TripFeatures {
  id: string;
  origin: string;
  destination: string;
  busType: string;
  price: number;
  departureTime: Date;
  operatorRating?: number;
  facilities: string[];
  distance?: number;
  duration?: number;
}

interface UserPreferences {
  preferredOrigins?: string[];
  preferredDestinations?: string[];
  preferredBusTypes?: string[];
  priceRange?: { min: number; max: number };
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  preferredFacilities?: string[];
}

export class ContentBasedRecommendation {
  private calculateSimilarityScore(
    trip: TripFeatures,
    preferences: UserPreferences,
    filters?: TripFilters
  ): number {
    let score = 0;
    let totalWeight = 0;

    // Origin preference (weight: 3)
    if (preferences.preferredOrigins?.length) {
      const weight = 3;
      totalWeight += weight;
      if (preferences.preferredOrigins.some(origin => 
        trip.origin.toLowerCase().includes(origin.toLowerCase())
      )) {
        score += weight;
      }
    }

    // Destination preference (weight: 3)
    if (preferences.preferredDestinations?.length) {
      const weight = 3;
      totalWeight += weight;
      if (preferences.preferredDestinations.some(dest => 
        trip.destination.toLowerCase().includes(dest.toLowerCase())
      )) {
        score += weight;
      }
    }

    // Bus type preference (weight: 2)
    if (preferences.preferredBusTypes?.length) {
      const weight = 2;
      totalWeight += weight;
      if (preferences.preferredBusTypes.some(type => 
        trip.busType.toLowerCase().includes(type.toLowerCase())
      )) {
        score += weight;
      }
    }

    // Price range preference (weight: 2)
    if (preferences.priceRange) {
      const weight = 2;
      totalWeight += weight;
      if (trip.price >= preferences.priceRange.min && trip.price <= preferences.priceRange.max) {
        score += weight;
      } else {
        // Partial score based on how close the price is to the range
        const distanceFromRange = Math.min(
          Math.abs(trip.price - preferences.priceRange.min),
          Math.abs(trip.price - preferences.priceRange.max)
        );
        const maxDistance = preferences.priceRange.max - preferences.priceRange.min;
        const partialScore = Math.max(0, 1 - (distanceFromRange / maxDistance));
        score += weight * partialScore;
      }
    }

    // Time of day preference (weight: 1)
    if (preferences.preferredTimeOfDay) {
      const weight = 1;
      totalWeight += weight;
      const departureHour = trip.departureTime.getHours();
      let matchesTimePreference = false;

      switch (preferences.preferredTimeOfDay) {
        case 'morning':
          matchesTimePreference = departureHour >= 6 && departureHour < 12;
          break;
        case 'afternoon':
          matchesTimePreference = departureHour >= 12 && departureHour < 18;
          break;
        case 'evening':
          matchesTimePreference = departureHour >= 18 && departureHour < 22;
          break;
        case 'night':
          matchesTimePreference = departureHour >= 22 || departureHour < 6;
          break;
      }

      if (matchesTimePreference) {
        score += weight;
      }
    }

    // Facilities preference (weight: 1.5)
    if (preferences.preferredFacilities?.length) {
      const weight = 1.5;
      totalWeight += weight;
      const matchingFacilities = preferences.preferredFacilities.filter(facility =>
        trip.facilities.some(tripFacility => 
          tripFacility.toLowerCase().includes(facility.toLowerCase())
        )
      );
      const facilityScore = matchingFacilities.length / preferences.preferredFacilities.length;
      score += weight * facilityScore;
    }

    // Filter-based boost (weight: 2)
    if (filters) {
      const filterWeight = 2;
      
      // Origin filter match
      if (filters.origin && trip.origin.toLowerCase().includes(filters.origin.toLowerCase())) {
        score += filterWeight;
        totalWeight += filterWeight;
      }

      // Destination filter match
      if (filters.destination && trip.destination.toLowerCase().includes(filters.destination.toLowerCase())) {
        score += filterWeight;
        totalWeight += filterWeight;
      }

      // Bus type filter match
      if (filters.busType && trip.busType.toLowerCase().includes(filters.busType.toLowerCase())) {
        score += filterWeight;
        totalWeight += filterWeight;
      }

      // Price range filter match
      if ((filters.minPrice && trip.price >= filters.minPrice) || 
          (filters.maxPrice && trip.price <= filters.maxPrice)) {
        score += filterWeight;
        totalWeight += filterWeight;
      }
    }

    // Operator rating boost (weight: 1)
    if (trip.operatorRating) {
      const weight = 1;
      totalWeight += weight;
      // Normalize rating (assuming 1-5 scale)
      score += weight * (trip.operatorRating / 5);
    }

    // Return normalized score (0-1)
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  public getRecommendedTrips(
    trips: any[],
    userPreferences: UserPreferences,
    filters?: TripFilters,
    limit: number = 10
  ): any[] {
    const scoredTrips = trips.map(trip => {
      const tripFeatures: TripFeatures = {
        id: trip.id,
        origin: trip.route.origin,
        destination: trip.route.destination,
        busType: trip.bus.busType,
        price: trip.price,
        departureTime: trip.departureTime,
        operatorRating: trip.operator.isVerified ? 4.5 : 3.5, // Simple rating based on verification
        facilities: trip.bus.facilities || [],
        distance: trip.route.distance,
        duration: trip.route.duration,
      };

      const similarityScore = this.calculateSimilarityScore(tripFeatures, userPreferences, filters);

      return {
        ...trip,
        contentScore: similarityScore,
      };
    });

    // Sort by content score (descending) and return top results
    return scoredTrips
      .sort((a, b) => b.contentScore - a.contentScore)
      .slice(0, limit);
  }

  public generateUserPreferences(_userId: string, historicalBookings: any[]): UserPreferences {
    // This is a placeholder implementation
    // In a real system, you would analyze user's booking history
    const preferences: UserPreferences = {};

    if (historicalBookings.length > 0) {
      // Extract common origins
      const origins = historicalBookings.map(b => b.trip.route.origin);
      preferences.preferredOrigins = [...new Set(origins)];

      // Extract common destinations
      const destinations = historicalBookings.map(b => b.trip.route.destination);
      preferences.preferredDestinations = [...new Set(destinations)];

      // Extract bus types
      const busTypes = historicalBookings.map(b => b.trip.bus.busType);
      preferences.preferredBusTypes = [...new Set(busTypes)];

      // Calculate price range
      const prices = historicalBookings.map(b => b.trip.price);
      if (prices.length > 0) {
        preferences.priceRange = {
          min: Math.min(...prices) * 0.8, // 20% below minimum
          max: Math.max(...prices) * 1.2, // 20% above maximum
        };
      }
    }

    return preferences;
  }

  public applyDiversity(recommendations: any[], diversityFactor: number = 0.3): any[] {
    if (recommendations.length <= 1) return recommendations;

    const diversified = [recommendations[0]]; // Always include the top recommendation
    
    for (let i = 1; i < recommendations.length; i++) {
      const candidate = recommendations[i];
      let isDiverse = true;

      // Check diversity with already selected recommendations
      for (const selected of diversified) {
        const routeSimilarity = candidate.route.origin === selected.route.origin && 
                               candidate.route.destination === selected.route.destination;
        const busTypeSimilarity = candidate.bus.busType === selected.bus.busType;
        const priceSimilarity = Math.abs(candidate.price - selected.price) < (selected.price * 0.1);

        if (routeSimilarity && busTypeSimilarity && priceSimilarity) {
          isDiverse = false;
          break;
        }
      }

      if (isDiverse || Math.random() < diversityFactor) {
        diversified.push(candidate);
      }

      if (diversified.length >= Math.ceil(recommendations.length * 0.8)) {
        break;
      }
    }

    return diversified;
  }
}

export const contentBasedRecommendation = new ContentBasedRecommendation();
