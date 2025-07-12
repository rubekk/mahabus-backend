import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@busticketing.com' },
    update: {},
    create: {
      email: 'admin@busticketing.com',
      password: adminPassword,
      name: 'System Administrator',
      phone: '9800000000',
      role: 'ADMIN',
    },
  });

  // Create operator user
  const operatorPassword = await bcrypt.hash('operator123', 10);
  const operator = await prisma.user.upsert({
    where: { email: 'operator@example.com' },
    update: {},
    create: {
      email: 'operator@example.com',
      password: operatorPassword,
      name: 'Bus Operator',
      phone: '9800000001',
      role: 'OPERATOR',
    },
  });

  // Create operator profile
  const operatorProfile = await prisma.operatorProfile.upsert({
    where: { userId: operator.id },
    update: {},
    create: {
      userId: operator.id,
      companyName: 'Himalayan Bus Service',
      licenseNo: 'LIC-2024-001',
      address: 'Kathmandu, Nepal',
      isVerified: true,
    },
  });

  // Create customer user
  const customerPassword = await bcrypt.hash('customer123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: {},
    create: {
      email: 'customer@example.com',
      password: customerPassword,
      name: 'John Doe',
      phone: '9800000002',
      role: 'CUSTOMER',
    },
  });

  // Create routes
  const routes = await Promise.all([
    prisma.route.upsert({
      where: { id: 'route-1' },
      update: {},
      create: {
        id: 'route-1',
        origin: 'Kathmandu',
        destination: 'Pokhara',
        distance: 200,
        duration: 360, // 6 hours
      },
    }),
    prisma.route.upsert({
      where: { id: 'route-2' },
      update: {},
      create: {
        id: 'route-2',
        origin: 'Kathmandu',
        destination: 'Chitwan',
        distance: 150,
        duration: 300, // 5 hours
      },
    }),
    prisma.route.upsert({
      where: { id: 'route-3' },
      update: {},
      create: {
        id: 'route-3',
        origin: 'Pokhara',
        destination: 'Chitwan',
        distance: 120,
        duration: 240, // 4 hours
      },
    }),
  ]);

  // Create buses
  const seatLayout = {
    rows: 10,
    seatsPerRow: 4,
    layout: [
      ['A1', 'A2', '', 'A3', 'A4'],
      ['B1', 'B2', '', 'B3', 'B4'],
      ['C1', 'C2', '', 'C3', 'C4'],
      ['D1', 'D2', '', 'D3', 'D4'],
      ['E1', 'E2', '', 'E3', 'E4'],
      ['F1', 'F2', '', 'F3', 'F4'],
      ['G1', 'G2', '', 'G3', 'G4'],
      ['H1', 'H2', '', 'H3', 'H4'],
      ['I1', 'I2', '', 'I3', 'I4'],
      ['J1', 'J2', '', 'J3', 'J4'],
    ],
  };

  const buses = await Promise.all([
    prisma.bus.upsert({
      where: { busNumber: 'BA-1-PA-1234' },
      update: {},
      create: {
        operatorId: operatorProfile.id,
        busNumber: 'BA-1-PA-1234',
        busType: 'AC Deluxe',
        totalSeats: 40,
        seatLayout,
        facilities: ['WiFi', 'Charging Point', 'Entertainment', 'AC'],
      },
    }),
    prisma.bus.upsert({
      where: { busNumber: 'BA-1-PA-5678' },
      update: {},
      create: {
        operatorId: operatorProfile.id,
        busNumber: 'BA-1-PA-5678',
        busType: 'Non-AC',
        totalSeats: 40,
        seatLayout,
        facilities: ['Charging Point'],
      },
    }),
  ]);

  // Create trips
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const trips = await Promise.all([
    prisma.trip.create({
      data: {
        busId: buses[0].id,
        routeId: routes[0].id,
        operatorId: operatorProfile.id,
        departureTime: new Date(tomorrow.setHours(8, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(14, 0, 0, 0)),
        price: 1200,
        availableSeats: 40,
      },
    }),
    prisma.trip.create({
      data: {
        busId: buses[1].id,
        routeId: routes[1].id,
        operatorId: operatorProfile.id,
        departureTime: new Date(tomorrow.setHours(10, 0, 0, 0)),
        arrivalTime: new Date(tomorrow.setHours(15, 0, 0, 0)),
        price: 800,
        availableSeats: 40,
      },
    }),
  ]);

  console.log('✅ Database seeded successfully!');
  console.log('👤 Admin user created:', admin.email);
  console.log('🚌 Operator user created:', operator.email);
  console.log('🧑‍💼 Customer user created:', customer.email);
  console.log(`📍 Created ${routes.length} routes`);
  console.log(`🚐 Created ${buses.length} buses`);
  console.log(`🗓️ Created ${trips.length} trips`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
