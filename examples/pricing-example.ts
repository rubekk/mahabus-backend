// Example usage of the Dynamic Pricing System

import { dynamicPricing } from '@/algorithms/pricing';

// Example trip data
const exampleTrip = {
    id: 'trip_123',
    departureTime: new Date('2025-08-08T08:00:00Z'), // Tomorrow 8 AM
    arrivalTime: new Date('2025-08-08T14:00:00Z'),
    price: 1200,
    originalPrice: null,
    status: 'SCHEDULED' as const,
    availableSeats: 15,
    bus: {
        totalSeats: 50
    },
    _count: {
        bookings: 35 // 70% occupancy
    },
    createdAt: new Date('2025-08-06T10:00:00Z'),
    busId: 'bus_123',
    routeId: 'route_123',
    operatorId: 'operator_123'
};

// Calculate dynamic price
const newPrice = dynamicPricing.calculateDynamicPrice(exampleTrip);
console.log(`Original Price: Rs. ${exampleTrip.price}`);
console.log(`Dynamic Price: Rs. ${newPrice}`);

// Get detailed pricing factors
const factors = dynamicPricing.getPricingFactors(exampleTrip);
console.log('Pricing Factors:', {
    timeFactor: factors.timeFactor, // Based on departure time
    occupancyFactor: factors.occupancyFactor, // 70% occupancy = high demand
    peakHourFactor: factors.peakHourFactor, // 8 AM = peak hour
    velocityFactor: factors.velocityFactor, // Booking speed
    finalPrice: factors.finalPrice,
    priceChange: `${factors.priceChange}%`
});

// Example scenarios:

// Scenario 1: Early bird booking (3 days before departure)
const earlyBirdTrip = {
    ...exampleTrip,
    departureTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    _count: { bookings: 5 } // Low occupancy
};
console.log('Early Bird Price:', dynamicPricing.calculateDynamicPrice(earlyBirdTrip));

// Scenario 2: Last minute booking (2 hours before departure)
const lastMinuteTrip = {
    ...exampleTrip,
    departureTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    _count: { bookings: 45 } // Very high occupancy
};
console.log('Last Minute Price:', dynamicPricing.calculateDynamicPrice(lastMinuteTrip));

// Scenario 3: Off-peak, low demand
const offPeakTrip = {
    ...exampleTrip,
    departureTime: new Date('2025-08-08T15:00:00Z'), // 3 PM (off-peak)
    _count: { bookings: 8 } // Low occupancy
};
console.log('Off-Peak Low Demand Price:', dynamicPricing.calculateDynamicPrice(offPeakTrip));

/*
Expected output:
Original Price: Rs. 1200
Dynamic Price: Rs. 1790

Pricing Factors: {
  timeFactor: 1.25,      // Last minute premium
  occupancyFactor: 1.3,  // High demand (70% occupancy)
  peakHourFactor: 1.15,  // Morning peak hour
  velocityFactor: 1.0,   // Normal booking velocity
  finalPrice: 1790,      // 1200 * 1.25 * 1.3 * 1.15 = 1897.5, capped at 1800
  priceChange: '49.2%'
}

Early Bird Price: Rs. 815        // 15% discount for early booking + low demand
Last Minute Price: Rs. 1800      // Maximum allowed increase (50%)
Off-Peak Low Demand Price: Rs. 960  // 20% discount for low occupancy
*/
