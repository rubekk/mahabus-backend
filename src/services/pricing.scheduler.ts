import { pricingService } from '@/services/pricing.service';

class PricingScheduler {
    private isRunning: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;

    /**
     * Start the pricing scheduler
     */
    public start(): void {
        console.log('[Pricing Scheduler] Starting dynamic pricing scheduler...');

        // Run every 15 minutes (15 * 60 * 1000 ms)
        const intervalMs = 15 * 60 * 1000;

        this.intervalId = setInterval(async () => {
            if (this.isRunning) {
                console.log('[Pricing Scheduler] Previous pricing update still running, skipping...');
                return;
            }

            this.isRunning = true;
            
            try {
                console.log('[Pricing Scheduler] Running scheduled pricing update...');
                const result = await pricingService.updateTripPrices();
                
                console.log(`[Pricing Scheduler] Update completed: ${result.pricesUpdated}/${result.totalTripsProcessed} trips updated`);
                
                // Log significant price changes
                const significantUpdates = result.updates.filter(update => Math.abs(update.adjustment) > 10);
                if (significantUpdates.length > 0) {
                    console.log(`[Pricing Scheduler] ${significantUpdates.length} trips with significant price changes (>10%)`);
                    significantUpdates.forEach(update => {
                        console.log(`  Trip ${update.tripId}: ${update.adjustment > 0 ? '+' : ''}${update.adjustment}% - ${update.reason}`);
                    });
                }
            } catch (error) {
                console.error('[Pricing Scheduler] Error during scheduled pricing update:', error);
            } finally {
                this.isRunning = false;
            }
        }, intervalMs);

        console.log('[Pricing Scheduler] Scheduler started - will run every 15 minutes');

        // Run initial pricing update after 30 seconds
        setTimeout(async () => {
            console.log('[Pricing Scheduler] Running initial pricing update...');
            try {
                const result = await pricingService.updateTripPrices();
                console.log(`[Pricing Scheduler] Initial update completed: ${result.pricesUpdated}/${result.totalTripsProcessed} trips updated`);
            } catch (error) {
                console.error('[Pricing Scheduler] Error during initial pricing update:', error);
            }
        }, 30000); // 30 seconds delay
    }

    /**
     * Stop the pricing scheduler
     */
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[Pricing Scheduler] Scheduler stopped');
    }

    /**
     * Run pricing update manually (for testing or admin triggers)
     */
    public async runManualUpdate(): Promise<{
        totalTripsProcessed: number;
        pricesUpdated: number;
        updates: any[];
    }> {
        if (this.isRunning) {
            throw new Error('Pricing update is already running');
        }

        this.isRunning = true;
        
        try {
            console.log('[Pricing Scheduler] Running manual pricing update...');
            const result = await pricingService.updateTripPrices();
            console.log(`[Pricing Scheduler] Manual update completed: ${result.pricesUpdated}/${result.totalTripsProcessed} trips updated`);
            return result;
        } catch (error) {
            console.error('[Pricing Scheduler] Error during manual pricing update:', error);
            throw error;
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Get scheduler status
     */
    public getStatus(): {
        isRunning: boolean;
        nextRun: string;
        configuration: string;
    } {
        return {
            isRunning: this.isRunning,
            nextRun: 'Every 15 minutes',
            configuration: 'Dynamic pricing based on time, occupancy, and booking velocity'
        };
    }

    /**
     * Health check for the scheduler
     */
    public async healthCheck(): Promise<{
        schedulerStatus: string;
        lastUpdate: Date;
        activeTripCount: number;
        averagePriceAdjustment: number;
    }> {
        try {
            const stats = await pricingService.getPricingStats();
            
            return {
                schedulerStatus: this.isRunning ? 'Running' : 'Idle',
                lastUpdate: stats.lastUpdateTime,
                activeTripCount: stats.totalActiveTrips,
                averagePriceAdjustment: stats.averagePriceAdjustment
            };
        } catch (error) {
            console.error('[Pricing Scheduler] Health check failed:', error);
            throw error;
        }
    }
}

export const pricingScheduler = new PricingScheduler();
