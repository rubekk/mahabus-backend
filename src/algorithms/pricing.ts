import { TripStatus } from "@prisma/client";

export interface PricingTrip {
    id: string;
    departureTime: Date;
    arrivalTime: Date;
    price: number;
    originalPrice?: number;
    status: TripStatus;
    availableSeats: number;
    bus: {
        totalSeats: number;
    };
    _count: {
        bookings: number;
    };
    createdAt: Date;
}

export interface PricingConfig {
    // Time-based pricing factors
    earlyBirdDiscount?: number;    // Discount for bookings far in advance (0-1)
    lastMinuteMultiplier?: number; // Price multiplier for last-minute bookings (>1)
    peakHourMultiplier?: number;   // Price multiplier for peak hours (>1)
    
    // Occupancy-based pricing factors
    highDemandMultiplier?: number; // Multiplier when occupancy > 70% (>1)
    lowDemandDiscount?: number;    // Discount when occupancy < 30% (0-1)
    
    // Time thresholds (in hours)
    earlyBirdThreshold?: number;   // Hours before departure for early bird discount
    lastMinuteThreshold?: number;  // Hours before departure for last-minute pricing
    
    // Price bounds
    maxPriceIncrease?: number;     // Maximum price increase factor (e.g., 2.0 = 200%)
    maxPriceDecrease?: number;     // Maximum price decrease factor (e.g., 0.5 = 50%)
    
    // Peak hours (24-hour format)
    peakHours?: { start: number; end: number }[];
}

class DynamicPricing {
    private defaultConfig: PricingConfig = {
        earlyBirdDiscount: 0.85,        // 15% discount for early bookings
        lastMinuteMultiplier: 1.25,     // 25% increase for last-minute bookings
        peakHourMultiplier: 1.15,       // 15% increase for peak hours
        
        highDemandMultiplier: 1.3,      // 30% increase for high occupancy
        lowDemandDiscount: 0.8,         // 20% discount for low occupancy
        
        earlyBirdThreshold: 48,         // 48 hours before departure
        lastMinuteThreshold: 6,         // 6 hours before departure
        
        maxPriceIncrease: 1.5,          // Maximum 50% price increase
        maxPriceDecrease: 0.7,          // Maximum 30% price decrease
        
        peakHours: [
            { start: 7, end: 10 },      // Morning peak
            { start: 17, end: 20 }      // Evening peak
        ]
    };

    /**
     * Calculate time-to-departure factor
     */
    private getTimeToDepatureFactor(trip: PricingTrip, config: PricingConfig): number {
        const now = new Date();
        const departureTime = new Date(trip.departureTime);
        const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        const {
            earlyBirdDiscount = 0.85,
            earlyBirdThreshold = 48,
            lastMinuteMultiplier = 1.25,
            lastMinuteThreshold = 6
        } = config;

        // Early bird discount
        if (hoursUntilDeparture > earlyBirdThreshold) {
            return earlyBirdDiscount;
        }
        
        // Last minute premium
        if (hoursUntilDeparture < lastMinuteThreshold) {
            return lastMinuteMultiplier;
        }

        // Normal pricing between thresholds
        return 1.0;
    }

    /**
     * Calculate occupancy-based factor
     */
    private getOccupancyFactor(trip: PricingTrip, config: PricingConfig): number {
        const totalSeats = trip.bus.totalSeats;
        const bookedSeats = trip._count.bookings;
        const occupancyRate = bookedSeats / totalSeats;

        const {
            highDemandMultiplier = 1.3,
            lowDemandDiscount = 0.8
        } = config;

        // High demand pricing (>70% occupancy)
        if (occupancyRate > 0.7) {
            return highDemandMultiplier;
        }
        
        // Low demand pricing (<30% occupancy)
        if (occupancyRate < 0.3) {
            return lowDemandDiscount;
        }

        // Normal pricing for moderate occupancy
        return 1.0;
    }

    /**
     * Calculate peak hour factor
     */
    private getPeakHourFactor(trip: PricingTrip, config: PricingConfig): number {
        const departureHour = new Date(trip.departureTime).getHours();
        const { peakHours = [], peakHourMultiplier = 1.15 } = config;

        const isPeakHour = peakHours.some(peak => 
            departureHour >= peak.start && departureHour <= peak.end
        );

        return isPeakHour ? peakHourMultiplier : 1.0;
    }

    /**
     * Calculate booking velocity factor (how fast seats are being booked)
     */
    private getBookingVelocityFactor(trip: PricingTrip): number {
        const now = new Date();
        const tripAge = (now.getTime() - trip.createdAt.getTime()) / (1000 * 60 * 60); // hours
        const occupancyRate = trip._count.bookings / trip.bus.totalSeats;
        
        // If trip is new (< 24 hours) and already has good bookings, increase price
        if (tripAge < 24 && occupancyRate > 0.2) {
            return 1.1; // 10% increase for high booking velocity
        }
        
        // If trip is old (> 72 hours) and low bookings, decrease price
        if (tripAge > 72 && occupancyRate < 0.2) {
            return 0.95; // 5% decrease for low booking velocity
        }

        return 1.0;
    }

    /**
     * Calculate dynamic price for a trip
     */
    public calculateDynamicPrice(
        trip: PricingTrip, 
        config: Partial<PricingConfig> = {}
    ): number {
        const finalConfig: PricingConfig = { ...this.defaultConfig, ...config };
        
        // Get base price (original price or current price)
        const basePrice = trip.originalPrice || trip.price;
        
        // Calculate all factors
        const timeFactor = this.getTimeToDepatureFactor(trip, finalConfig);
        const occupancyFactor = this.getOccupancyFactor(trip, finalConfig);
        const peakHourFactor = this.getPeakHourFactor(trip, finalConfig);
        const velocityFactor = this.getBookingVelocityFactor(trip);
        
        // Calculate dynamic price
        let dynamicPrice = basePrice * timeFactor * occupancyFactor * peakHourFactor * velocityFactor;
        
        // Apply bounds to prevent extreme pricing
        const {
            maxPriceIncrease = 1.5,
            maxPriceDecrease = 0.7
        } = finalConfig;
        
        const maxPrice = basePrice * maxPriceIncrease;
        const minPrice = basePrice * maxPriceDecrease;
        
        dynamicPrice = Math.max(minPrice, Math.min(maxPrice, dynamicPrice));
        
        // Round to nearest 5 (for clean pricing)
        return Math.round(dynamicPrice / 5) * 5;
    }

    /**
     * Calculate price adjustment for multiple trips
     */
    public calculateBatchPricing(
        trips: PricingTrip[],
        config: Partial<PricingConfig> = {}
    ): Array<{ tripId: string; currentPrice: number; newPrice: number; adjustment: number }> {
        return trips.map(trip => {
            const newPrice = this.calculateDynamicPrice(trip, config);
            const adjustment = ((newPrice - trip.price) / trip.price) * 100;
            
            return {
                tripId: trip.id,
                currentPrice: trip.price,
                newPrice,
                adjustment: Math.round(adjustment * 100) / 100 // Round to 2 decimal places
            };
        });
    }

    /**
     * Get pricing factors for analysis
     */
    public getPricingFactors(
        trip: PricingTrip,
        config: Partial<PricingConfig> = {}
    ): {
        timeFactor: number;
        occupancyFactor: number;
        peakHourFactor: number;
        velocityFactor: number;
        finalPrice: number;
        priceChange: number;
    } {
        const finalConfig: PricingConfig = { ...this.defaultConfig, ...config };
        
        const timeFactor = this.getTimeToDepatureFactor(trip, finalConfig);
        const occupancyFactor = this.getOccupancyFactor(trip, finalConfig);
        const peakHourFactor = this.getPeakHourFactor(trip, finalConfig);
        const velocityFactor = this.getBookingVelocityFactor(trip);
        const finalPrice = this.calculateDynamicPrice(trip, config);
        const priceChange = ((finalPrice - trip.price) / trip.price) * 100;

        return {
            timeFactor,
            occupancyFactor,
            peakHourFactor,
            velocityFactor,
            finalPrice,
            priceChange: Math.round(priceChange * 100) / 100
        };
    }

    /**
     * Check if price update is significant enough to apply
     */
    public shouldUpdatePrice(
        currentPrice: number,
        newPrice: number,
        threshold: number = 2 // 2% minimum change
    ): boolean {
        const changePercentage = Math.abs((newPrice - currentPrice) / currentPrice) * 100;
        return changePercentage >= threshold;
    }
}

export const dynamicPricing = new DynamicPricing();
