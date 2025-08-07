import prisma from '@/config/database';
import { dynamicPricing, PricingConfig } from '@/algorithms/pricing';
import { TripStatus } from '@prisma/client';

export interface PricingUpdate {
    tripId: string;
    oldPrice: number;
    newPrice: number;
    adjustment: number;
    reason: string;
    timestamp: Date;
}

export class PricingService {
    private pricingConfig: Partial<PricingConfig> = {
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
            { start: 7, end: 10 },      // Morning peak: 7 AM - 10 AM
            { start: 17, end: 20 }      // Evening peak: 5 PM - 8 PM
        ]
    };

    /**
     * Get trips that are eligible for price updates
     */
    private async getEligibleTrips() {
        const now = new Date();
        const maxFutureDate = new Date();
        maxFutureDate.setDate(now.getDate() + 7); // Only update trips within next 7 days

        return await prisma.trip.findMany({
            where: {
                status: TripStatus.SCHEDULED,
                departureTime: {
                    gte: now, // Future trips only
                    lte: maxFutureDate // Not too far in future
                }
            },
            include: {
                bus: {
                    select: {
                        totalSeats: true
                    }
                },
                _count: {
                    select: {
                        bookings: {
                            where: {
                                status: {
                                    in: ['CONFIRMED', 'PENDING']
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Update prices for all eligible trips
     */
    public async updateTripPrices(): Promise<{
        totalTripsProcessed: number;
        pricesUpdated: number;
        updates: PricingUpdate[];
    }> {
        try {
            console.log('[Pricing Service] Starting dynamic pricing update...');
            
            const trips = await this.getEligibleTrips();
            const updates: PricingUpdate[] = [];
            let pricesUpdated = 0;

            for (const trip of trips) {
                try {
                    // Calculate new price
                    const newPrice = dynamicPricing.calculateDynamicPrice(trip, this.pricingConfig);
                    
                    // Check if update is significant enough
                    if (dynamicPricing.shouldUpdatePrice(trip.price, newPrice, 2)) {
                        // Store original price if not already stored
                        const originalPrice = trip.originalPrice || trip.price;
                        
                        // Update the trip price
                        await prisma.trip.update({
                            where: { id: trip.id },
                            data: {
                                price: newPrice,
                                originalPrice: originalPrice, // Store original price for reference
                                updatedAt: new Date()
                            }
                        });

                        // Calculate adjustment percentage
                        const adjustment = ((newPrice - trip.price) / trip.price) * 100;
                        
                        // Determine reason for price change
                        const factors = dynamicPricing.getPricingFactors(trip, this.pricingConfig);
                        const reason = this.getPriceChangeReason(factors);

                        const update: PricingUpdate = {
                            tripId: trip.id,
                            oldPrice: trip.price,
                            newPrice,
                            adjustment: Math.round(adjustment * 100) / 100,
                            reason,
                            timestamp: new Date()
                        };

                        updates.push(update);
                        pricesUpdated++;

                        console.log(`[Pricing Service] Updated trip ${trip.id}: ${trip.price} → ${newPrice} (${adjustment.toFixed(1)}%) - ${reason}`);
                    }
                } catch (error) {
                    console.error(`[Pricing Service] Error updating trip ${trip.id}:`, error);
                }
            }

            console.log(`[Pricing Service] Completed: ${pricesUpdated}/${trips.length} trips updated`);

            return {
                totalTripsProcessed: trips.length,
                pricesUpdated,
                updates
            };
        } catch (error) {
            console.error('[Pricing Service] Error in updateTripPrices:', error);
            throw error;
        }
    }

    /**
     * Get human-readable reason for price change
     */
    private getPriceChangeReason(factors: {
        timeFactor: number;
        occupancyFactor: number;
        peakHourFactor: number;
        velocityFactor: number;
        priceChange: number;
    }): string {
        const reasons: string[] = [];

        if (factors.timeFactor < 1) {
            reasons.push('Early bird discount');
        } else if (factors.timeFactor > 1) {
            reasons.push('Last-minute premium');
        }

        if (factors.occupancyFactor > 1) {
            reasons.push('High demand');
        } else if (factors.occupancyFactor < 1) {
            reasons.push('Low occupancy');
        }

        if (factors.peakHourFactor > 1) {
            reasons.push('Peak hour');
        }

        if (factors.velocityFactor > 1) {
            reasons.push('Fast booking rate');
        } else if (factors.velocityFactor < 1) {
            reasons.push('Slow booking rate');
        }

        if (reasons.length === 0) {
            return 'Price optimization';
        }

        return reasons.join(', ');
    }

    /**
     * Get pricing statistics
     */
    public async getPricingStats(): Promise<{
        totalActiveTrips: number;
        averagePriceAdjustment: number;
        tripsWithIncreasedPrices: number;
        tripsWithDecreasedPrices: number;
        lastUpdateTime: Date;
    }> {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const activeTrips = await prisma.trip.count({
            where: {
                status: TripStatus.SCHEDULED,
                departureTime: { gte: now }
            }
        });

        const recentlyUpdatedTrips = await prisma.trip.findMany({
            where: {
                status: TripStatus.SCHEDULED,
                updatedAt: { gte: oneDayAgo },
                originalPrice: { not: null }
            },
            select: {
                price: true,
                originalPrice: true,
                updatedAt: true
            }
        });

        let totalAdjustment = 0;
        let increasedCount = 0;
        let decreasedCount = 0;
        let lastUpdate = new Date(0);

        for (const trip of recentlyUpdatedTrips) {
            if (trip.originalPrice) {
                const adjustment = ((trip.price - trip.originalPrice) / trip.originalPrice) * 100;
                totalAdjustment += Math.abs(adjustment);
                
                if (trip.price > trip.originalPrice) {
                    increasedCount++;
                } else if (trip.price < trip.originalPrice) {
                    decreasedCount++;
                }

                if (trip.updatedAt > lastUpdate) {
                    lastUpdate = trip.updatedAt;
                }
            }
        }

        const averagePriceAdjustment = recentlyUpdatedTrips.length > 0 
            ? totalAdjustment / recentlyUpdatedTrips.length 
            : 0;

        return {
            totalActiveTrips: activeTrips,
            averagePriceAdjustment: Math.round(averagePriceAdjustment * 100) / 100,
            tripsWithIncreasedPrices: increasedCount,
            tripsWithDecreasedPrices: decreasedCount,
            lastUpdateTime: lastUpdate
        };
    }

    /**
     * Revert a trip to its original price
     */
    public async revertTripPrice(tripId: string): Promise<void> {
        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            select: { originalPrice: true }
        });

        if (!trip?.originalPrice) {
            throw new Error('Trip not found or has no original price');
        }

        await prisma.trip.update({
            where: { id: tripId },
            data: {
                price: trip.originalPrice,
                originalPrice: null, // Clear original price
                updatedAt: new Date()
            }
        });

        console.log(`[Pricing Service] Reverted trip ${tripId} to original price: ${trip.originalPrice}`);
    }

    /**
     * Update pricing configuration
     */
    public updatePricingConfig(newConfig: Partial<PricingConfig>): void {
        this.pricingConfig = { ...this.pricingConfig, ...newConfig };
        console.log('[Pricing Service] Updated pricing configuration:', newConfig);
    }

    /**
     * Get current pricing configuration
     */
    public getPricingConfig(): Partial<PricingConfig> {
        return { ...this.pricingConfig };
    }
}

export const pricingService = new PricingService();
