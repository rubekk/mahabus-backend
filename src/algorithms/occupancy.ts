import { TripStatus } from "@prisma/client";

export interface Trip {
    _count: {
        bookings: number;
    };
    route: {
        id: string;
        origin: string;
        destination: string;
        distance: number;
        duration: number;
    };
    bus: {
        id: string;
        busType: string;
        busNumber: string;
        totalSeats: number;
        facilities: string[];
    };
    operator: {
        id: string;
        companyName: string;
        isVerified: boolean;
    };
    id: string;
    createdAt: Date;
    updatedAt: Date;
    busId: string;
    routeId: string;
    departureTime: Date;
    arrivalTime: Date;
    price: number;
    status: TripStatus;
    operatorId: string;
    availableSeats: number;
    contentScore?: number; 
}

export interface OccupancyConfig {
    minOccupancyThreshold?: number; // Minimum occupancy % to include in results
    occupancyBoostFactor?: number;  // How much to boost high-occupancy trips
    lowOccupancyPenalty?: number;   // Penalty for very low occupancy
    balanceWithContentScore?: boolean; // Whether to balance with content-based scores
}

class OccupancySorting {
    private defaultConfig: OccupancyConfig = {
        minOccupancyThreshold: 10, // Remove trips with less than 10% occupancy
        occupancyBoostFactor: 1.5, // Boost high occupancy trips by 1.5x
        lowOccupancyPenalty: 0.5,  // Reduce score by 50% for very low occupancy
        balanceWithContentScore: true
    };

    /**
     * Calculate bus occupancy percentage
     */
    private getBusOccupancy(trip: Trip): number {
        const totalSeats = trip.bus.totalSeats;
        const bookedSeats = trip._count.bookings;
        return (bookedSeats / totalSeats) * 100; 
    }

    /**
     * Calculate occupancy score based on occupancy percentage
     */
    private calculateOccupancyScore(occupancy: number, config: OccupancyConfig): number {
        const {
            occupancyBoostFactor = 1.5,
            lowOccupancyPenalty = 0.5
        } = config;

        // Base score is the occupancy percentage normalized (0-1)
        let score = occupancy / 100;

        // Apply boost for high occupancy (>60%)
        if (occupancy > 60) {
            score *= occupancyBoostFactor;
        }
        // Apply penalty for very low occupancy (<20%)
        else if (occupancy < 20) {
            score *= lowOccupancyPenalty;
        }

        // Ensure score doesn't exceed 1
        return Math.min(score, 1);
    }

    /**
     * Filter out trips below minimum occupancy threshold
     */
    private filterByMinOccupancy(trips: Trip[], config: OccupancyConfig): Trip[] {
        const { minOccupancyThreshold = 10 } = config;
        
        return trips.filter(trip => {
            const occupancy = this.getBusOccupancy(trip);
            return occupancy >= minOccupancyThreshold;
        });
    }

    /**
     * Sort trips by occupancy, considering content-based scores
     */
    public sortByOccupancy(
        trips: Trip[], 
        config: Partial<OccupancyConfig> = {}
    ): Trip[] {
        const finalConfig: OccupancyConfig = { ...this.defaultConfig, ...config };

        // First, filter out trips with very low occupancy
        let processedTrips = this.filterByMinOccupancy(trips, finalConfig);

        // Calculate occupancy scores and combine with content scores
        const scoredTrips = processedTrips.map(trip => {
            const occupancy = this.getBusOccupancy(trip);
            const occupancyScore = this.calculateOccupancyScore(occupancy, finalConfig);

            let finalScore = occupancyScore;

            // Balance with content-based score if available
            if (finalConfig.balanceWithContentScore && trip.contentScore !== undefined) {
                // Weight: 60% content-based, 40% occupancy-based
                finalScore = (trip.contentScore * 0.6) + (occupancyScore * 0.4);
            }

            return {
                ...trip,
                occupancy,
                occupancyScore,
                finalScore
            };
        });

        // Sort by final score (descending) - higher scores first
        return scoredTrips.sort((a, b) => {
            // Primary sort: final score
            if (b.finalScore !== a.finalScore) {
                return b.finalScore - a.finalScore;
            }
            
            // Secondary sort: occupancy percentage
            if (b.occupancy !== a.occupancy) {
                return b.occupancy - a.occupancy;
            }
            
            // Tertiary sort: departure time (earlier first)
            return a.departureTime.getTime() - b.departureTime.getTime();
        });
    }

    /**
     * Get occupancy statistics for a set of trips
     */
    public getOccupancyStats(trips: Trip[]): {
        averageOccupancy: number;
        highOccupancyCount: number;
        lowOccupancyCount: number;
        totalTrips: number;
    } {
        if (trips.length === 0) {
            return {
                averageOccupancy: 0,
                highOccupancyCount: 0,
                lowOccupancyCount: 0,
                totalTrips: 0
            };
        }

        const occupancies = trips.map(trip => this.getBusOccupancy(trip));
        const averageOccupancy = occupancies.reduce((sum, occ) => sum + occ, 0) / occupancies.length;
        const highOccupancyCount = occupancies.filter(occ => occ > 60).length;
        const lowOccupancyCount = occupancies.filter(occ => occ < 20).length;

        return {
            averageOccupancy: Math.round(averageOccupancy * 100) / 100,
            highOccupancyCount,
            lowOccupancyCount,
            totalTrips: trips.length
        };
    }

    /**
     * Apply smart occupancy filtering that promotes higher occupancy
     * while maintaining trip variety
     */
    public smartOccupancyFilter(
        trips: Trip[], 
        targetCount: number, 
        config: Partial<OccupancyConfig> = {}
    ): Trip[] {
        const finalConfig: OccupancyConfig = { ...this.defaultConfig, ...config };
        
        // Sort trips by occupancy score
        const sortedTrips = this.sortByOccupancy(trips, finalConfig);
        
        if (sortedTrips.length <= targetCount) {
            return sortedTrips;
        }

        // Take top trips but ensure diversity in routes and operators
        const selectedTrips: Trip[] = [];
        const usedRoutes = new Set<string>();
        const operatorCount = new Map<string, number>();
        
        // First pass: prioritize high-occupancy trips
        for (const trip of sortedTrips) {
            if (selectedTrips.length >= targetCount) break;
            
            const routeKey = `${trip.route.origin}-${trip.route.destination}`;
            const operatorTrips = operatorCount.get(trip.operatorId) || 0;
            
            // Include if high occupancy or route/operator diversity needed
            const occupancy = this.getBusOccupancy(trip);
            const isHighOccupancy = occupancy > 40;
            const routeDiversity = !usedRoutes.has(routeKey) || usedRoutes.size < 3;
            const operatorDiversity = operatorTrips < Math.ceil(targetCount / 3);
            
            if (isHighOccupancy || (routeDiversity && operatorDiversity)) {
                selectedTrips.push(trip);
                usedRoutes.add(routeKey);
                operatorCount.set(trip.operatorId, operatorTrips + 1);
            }
        }
        
        // Fill remaining slots with best remaining trips
        if (selectedTrips.length < targetCount) {
            const remainingTrips = sortedTrips.filter(trip => 
                !selectedTrips.some(selected => selected.id === trip.id)
            );
            
            const slotsLeft = targetCount - selectedTrips.length;
            selectedTrips.push(...remainingTrips.slice(0, slotsLeft));
        }
        
        return selectedTrips;
    }
}

export const occupancySorting = new OccupancySorting();