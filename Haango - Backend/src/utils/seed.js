import mongoose from 'mongoose';
import { connectDatabase } from '../config/database.js';
import User from '../models/User.js';
import BuddyProfile from '../models/BuddyProfile.js';
import Activity from '../models/Activity.js';
import Booking from '../models/Booking.js';
import Review from '../models/Review.js';
import { generateBookingId } from './helpers.js';
import { env } from '../config/environment.js';

const activitiesData = [
  { name: 'Movie Night', slug: 'movie', emoji: '🎬', description: 'Catch the latest blockbuster or a cult classic together.', image: 'https://images.pexels.com/photos/7991258/pexels-photo-7991258.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 1 },
  { name: 'Coffee & Conversations', slug: 'coffee', emoji: '☕', description: 'Flat whites, filter coffee, and no awkward silences.', image: 'https://images.pexels.com/photos/5709521/pexels-photo-5709521.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 2 },
  { name: 'Shopping', slug: 'shopping', emoji: '🛍️', description: 'A second opinion that actually has taste.', image: 'https://images.pexels.com/photos/7155936/pexels-photo-7155936.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 3 },
  { name: 'Lunch / Dinner', slug: 'dining', emoji: '🍽️', description: 'Good food, better company, zero solo-table awkwardness.', image: 'https://images.pexels.com/photos/8921578/pexels-photo-8921578.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 4 },
  { name: 'Events', slug: 'events', emoji: '🎉', description: 'Concerts, festivals, and everything worth showing up for.', image: 'https://images.pexels.com/photos/14364670/pexels-photo-14364670.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 5 },
  { name: 'Explore the City', slug: 'explore-city', emoji: '🚶', description: 'Wander streets, find cafes, and play tourist in your own city.', image: 'https://images.pexels.com/photos/4881146/pexels-photo-4881146.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 6 },
  { name: 'Gaming', slug: 'gaming', emoji: '🎮', description: 'Co-op, competitive, or just chilling on the couch.', image: 'https://images.pexels.com/photos/9068963/pexels-photo-9068963.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 7 },
  { name: 'Date', slug: 'date', emoji: '💐', description: 'Plan a relaxed date with good company.', image: 'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 8 },
  { name: 'City Travel', slug: 'city-travel', emoji: '🚶', description: 'Explore the city and discover new places together.', image: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&h=400&w=600', order: 9 },
];

const buddySeedData = [
  { name: 'Aarav', age: 24, tagline: 'Coffee enthusiast, movie lover & terrible at bowling.', city: 'Lucknow', image: 'https://images.pexels.com/photos/6338266/pexels-photo-6338266.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/6338266/pexels-photo-6338266.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/6102858/pexels-photo-6102858.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/9817252/pexels-photo-9817252.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 4.9, outings: 87, pricePerHour: 499, interests: ['Coffee','Movies','Gaming','Street Food'], activities: ['movie','coffee','gaming','dining'], languages: ['Hindi','English','Awadhi'], availability: ['Weekdays after 5 PM','Weekends anytime'], responseTime: 'Usually replies in 30 minutes', about: "I'm the person who actually shows up on time. Big into indie films, filter coffee, and finding the best momo stalls in the city." },
  { name: 'Priya', age: 23, tagline: 'Knows every hidden cafe in the city. Will judge your coffee order.', city: 'Mumbai', image: 'https://images.pexels.com/photos/8720868/pexels-photo-8720868.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/8720868/pexels-photo-8720868.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/36918310/pexels-photo-36918310.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/10210852/pexels-photo-10210852.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 5.0, outings: 112, pricePerHour: 599, interests: ['Coffee','Shopping','Events','Photography'], activities: ['coffee','shopping','events','social'], languages: ['Hindi','English','Marathi'], availability: ['Weekends','Friday evenings'], responseTime: 'Usually replies in 15 minutes', about: "I've been exploring Mumbai's cafe scene since I was 16. I know the city like the back of my hand." },
  { name: 'Rohan', age: 26, tagline: 'Gym rat, foodie, and surprisingly good at karaoke.', city: 'Delhi', image: 'https://images.pexels.com/photos/2590287/pexels-photo-2590287.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/2590287/pexels-photo-2590287.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/6502290/pexels-photo-6502290.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/6200777/pexels-photo-6200777.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 4.8, outings: 64, pricePerHour: 449, interests: ['Dining','Sports','Events','Fitness'], activities: ['dining','sports','events','explore-city'], languages: ['Hindi','English','Punjabi'], availability: ['Weekday evenings','Weekends'], responseTime: 'Usually replies in 45 minutes', about: "Delhi-born, food-obsessed, and always up for an adventure." },
  { name: 'Sneha', age: 25, tagline: 'Art gallery hopper. Will find the aesthetic in everything.', city: 'Bangalore', image: 'https://images.pexels.com/photos/20132403/pexels-photo-20132403.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/20132403/pexels-photo-20132403.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/7485047/pexels-photo-7485047.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/36152386/pexels-photo-36152386.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 4.9, outings: 93, pricePerHour: 549, interests: ['Events','Coffee','Photography','Art'], activities: ['events','coffee','social','explore-city'], languages: ['Hindi','English','Kannada'], availability: ['Weekends','Thursday evenings'], responseTime: 'Usually replies in 20 minutes', about: "I live for weekend art markets, indie music gigs, and long walks in Cubbon Park." },
  { name: 'Vikram', age: 28, tagline: 'Will beat you at FIFA and then buy you dinner to make up for it.', city: 'Pune', image: 'https://images.pexels.com/photos/6102858/pexels-photo-6102858.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/6102858/pexels-photo-6102858.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/6338266/pexels-photo-6338266.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/29153201/pexels-photo-29153201.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 4.7, outings: 51, pricePerHour: 399, interests: ['Gaming','Dining','Movies'], activities: ['gaming','dining','movie'], languages: ['Hindi','English'], availability: ['Weekends only'], responseTime: 'Usually replies in 1 hour', about: "Software engineer by day, FIFA pro by night. I'm laid-back and easy to talk to." },
  { name: 'Ananya', age: 22, tagline: "Professional window shopper. Will find deals you didn't know existed.", city: 'Hyderabad', image: 'https://images.pexels.com/photos/36918310/pexels-photo-36918310.jpeg?auto=compress&cs=tinysrgb&h=800&w=600', gallery: ['https://images.pexels.com/photos/36918310/pexels-photo-36918310.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/8720868/pexels-photo-8720868.jpeg?auto=compress&cs=tinysrgb&h=800&w=600','https://images.pexels.com/photos/17827869/pexels-photo-17827869.jpeg?auto=compress&cs=tinysrgb&h=800&w=600'], rating: 4.9, outings: 78, pricePerHour: 499, interests: ['Shopping','Coffee','Events','Movies'], activities: ['shopping','coffee','events','movie'], languages: ['Hindi','English','Telugu'], availability: ['Weekends','Wednesday evenings'], responseTime: 'Usually replies in 25 minutes', about: "I have a sixth sense for sales and a talent for making shopping fun." },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  const connected = await connectDatabase();
  if (!connected) {
    console.error('Cannot seed without database connection. Set MONGODB_URI in backend/.env');
    process.exit(1);
  }

  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    BuddyProfile.deleteMany({}),
    Activity.deleteMany({}),
    Booking.deleteMany({}),
    Review.deleteMany({}),
  ]);

  console.log('Creating activities...');
  const activities = await Activity.insertMany(activitiesData);

  console.log('Creating admin user...');
  const adminPasswordHash = await User.hashPassword('admin123456');
  await User.create({
    name: 'Haango Admin',
    email: 'admin@haango.com',
    phone: '+919999999999',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    isActive: true,
    isVerified: true,
  });

  console.log('Creating customers...');
  const customerNames = ['Riya', 'Dev', 'Karan', 'Meera', 'Aditya', 'Tanvi', 'Nikhil', 'Ishita', 'Kabir', 'Ananya C'];
  const customers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const hash = await User.hashPassword('customer123');
    const user = await User.create({
      name: customerNames[i],
      email: `customer${i + 1}@haango.com`,
      phone: `+9198765432${String(i).padStart(2, '0')}`,
      passwordHash: hash,
      role: 'CUSTOMER',
      city: ['Lucknow','Mumbai','Delhi','Bangalore','Pune','Hyderabad'][i % 6],
    });
    customers.push(user);
  }

  console.log('Creating buddies...');
  const buddies = [];
  for (const data of buddySeedData) {
    const hash = await User.hashPassword('buddy123');
    const user = await User.create({
      name: data.name,
      email: `${data.name.toLowerCase()}@haango.com`,
      phone: `+919876500${buddies.length + 1}`,
      passwordHash: hash,
      role: 'BUDDY',
      city: data.city,
      isVerified: true,
    });

    const profile = await BuddyProfile.create({
      userId: user._id,
      displayName: data.name,
      age: data.age,
      bio: data.about,
      tagline: data.tagline,
      city: data.city,
      profileImages: data.gallery,
      interests: data.interests,
      activities: data.activities,
      languages: data.languages,
      hourlyRate: data.pricePerHour,
      rating: data.rating,
      reviewCount: Math.floor(data.outings * 0.3),
      completedBookings: data.outings,
      verificationStatus: 'VERIFIED',
      isAvailable: true,
      responseTime: data.responseTime,
      availability: data.availability.map((slot) => ({
        day: slot.includes('Weekend') ? 'saturday' : 'monday',
        startTime: '09:00',
        endTime: '21:00',
        isAvailable: true,
      })),
    });
    buddies.push({ user, profile });
  }

  console.log('Creating sample bookings...');
  const now = new Date();
  const bookings = [];
  for (let i = 0; i < 5; i++) {
    const buddy = buddies[i % buddies.length];
    const customer = customers[i];
    const activity = activities[i % activities.length];
    const date = new Date(now);
    date.setDate(date.getDate() + i - 2);
    const duration = 2 + (i % 3);
    const buddyFee = buddy.profile.hourlyRate * duration;
    const platformFee = Math.round(buddyFee * 0.1);
    const total = buddyFee + platformFee;

    const booking = await Booking.create({
      bookingId: generateBookingId(),
      customerId: customer._id,
      buddyId: buddy.user._id,
      buddyProfileId: buddy.profile._id,
      activityId: activity._id,
      activitySlug: activity.slug,
      date,
      startTime: '7:00 PM',
      duration,
      meetingLocation: `${buddy.profile.city} City Center`,
      buddyRate: buddy.profile.hourlyRate,
      platformFee,
      totalAmount: total,
      paymentStatus: i < 2 ? 'PAID' : 'PENDING',
      bookingStatus: i < 2 ? 'COMPLETED' : i < 4 ? 'CONFIRMED' : 'PENDING',
    });
    bookings.push(booking);
  }

  console.log('Creating sample reviews...');
  const reviewTexts = [
    { rating: 5, text: 'Really easy to talk to and the plan was super smooth.' },
    { rating: 5, text: 'Great conversation and genuinely good company.' },
    { rating: 4, text: 'Fun session! Great sport.' },
    { rating: 5, text: 'Best evening in months. Would book again.' },
    { rating: 5, text: 'Made me feel comfortable instantly. Such a warm person.' },
  ];
  for (let i = 0; i < 5; i++) {
    const booking = bookings[i];
    if (booking.bookingStatus === 'COMPLETED') {
      const review = reviewTexts[i];
      await Review.create({
        bookingId: booking._id,
        customerId: booking.customerId,
        buddyId: booking.buddyId,
        rating: review.rating,
        comment: review.text,
        activityName: booking.activitySlug,
      });
    }
  }

  console.log('\n✓ Seed complete!');
  console.log(`  Activities: ${activities.length}`);
  console.log(`  Customers: ${customers.length}`);
  console.log(`  Buddies: ${buddies.length}`);
  console.log(`  Bookings: ${bookings.length}`);
  console.log('\n  Demo login credentials:');
  console.log('  Admin:   admin@haango.com / admin123456');
  console.log('  Customer: customer1@haango.com / customer123');
  console.log('  Buddy:   aarav@haango.com / buddy123');
  console.log('\n  ⚠ This is development/demo data — not real users.');

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err);
  process.exit(1);
});
