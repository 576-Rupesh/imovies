// Usage: npm run seed   (wipes the database and loads demo data)
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const User = require('./models/User');
const Movie = require('./models/Movie');
const Theatre = require('./models/Theatre');
const Show = require('./models/Show');
const Seat = require('./models/Seat');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const { buildSeats } = require('./utils/seatGenerator');

const daysFromNow = (n) => new Date(Date.now() + n * 86400000);

const movies = [
  { title: 'Midnight Monsoon', genres: ['Drama', 'Romance'], language: 'Hindi', duration: 138, rating: 'U/A', score: 8.1, director: 'Meera Kapoor', cast: ['Aarav Sethi', 'Naina Rao'], description: 'Two strangers share a stalled train through one long night of rain in Mumbai, and by sunrise neither is the person who boarded.' },
  { title: 'The Last Lighthouse Keeper', genres: ['Thriller', 'Mystery'], language: 'English', duration: 124, rating: 'U/A', score: 7.8, director: 'Tom Ellery', cast: ['Grace Holloway', 'Idris Vale'], description: 'A storm cuts off a remote island lighthouse just as its keeper finds a logbook that predicts what happens next.' },
  { title: 'Neon Bazaar', genres: ['Sci-Fi', 'Action'], language: 'Telugu', duration: 156, rating: 'U/A', score: 8.4, director: 'Karthik Varma', cast: ['Ravi Teja Naidu', 'Sana Mirza'], description: 'In a floating night market above Hyderabad, a courier carries a package that every gang in the city wants.' },
  { title: 'Chai Wars', genres: ['Comedy'], language: 'Hindi', duration: 118, rating: 'U', score: 7.2, director: 'Pooja Bhatt', cast: ['Vikram Joshi', 'Tanvi Shah'], description: 'Two rival tea stalls on the same lane go to absurd lengths to win the street\u2019s loyalty before the new metro opens.' },
  { title: 'Paper Cranes', genres: ['Animation', 'Family'], language: 'English', duration: 96, rating: 'U', score: 8.6, director: 'Hana Ito', cast: ['Voices of Mia Chen', 'Leo Park'], description: 'A girl folds a thousand paper cranes and discovers each one carries her to a different corner of her grandmother\u2019s memory.' },
  { title: 'Kuruvi', genres: ['Action', 'Drama'], language: 'Tamil', duration: 149, rating: 'A', score: 7.9, director: 'Selvam R', cast: ['Dhanush Kumar', 'Lakshmi Iyer'], description: 'A retired stunt rider is pulled back into the ring when his old crew\u2019s debts come due.' },
  { title: 'Hollow House', genres: ['Horror'], language: 'English', duration: 104, rating: 'A', score: 6.9, director: 'Nina Park', cast: ['Eli Marsh', 'Ruth Calder'], description: 'A family inherits a house where every room is slightly larger on the inside than the outside.' },
  { title: 'Saturday Orchestra', genres: ['Drama', 'Music'], language: 'Tamil', duration: 131, rating: 'U', score: 8.0, director: 'Anand Subbu', cast: ['Gayathri Nair', 'Murali D'], description: 'A shuttered school band reunites twenty years later to play one last concert for their old teacher.' },
];

const theatres = [
  { name: 'Aurora Cinemas', city: 'Hyderabad', address: 'Banjara Hills Road No. 12', screens: [{ name: 'Screen 1', rows: 8, cols: 12 }, { name: 'Screen 2', rows: 6, cols: 10 }] },
  { name: 'Lumen Multiplex', city: 'Bengaluru', address: 'MG Road, near Trinity Circle', screens: [{ name: 'Audi 1', rows: 8, cols: 14 }, { name: 'Audi 2', rows: 6, cols: 10 }] },
  { name: 'Regal Marquee', city: 'Mumbai', address: 'Linking Road, Bandra West', screens: [{ name: 'Hall A', rows: 9, cols: 12 }, { name: 'Hall B', rows: 6, cols: 10 }] },
];

const slots = [[10, 30], [14, 0], [18, 0], [21, 30]];

(async () => {
  await connectDB();
  await Promise.all([User, Movie, Theatre, Show, Seat, Booking, Payment, Notification].map((m) => m.deleteMany({})));

  await User.create([
    { name: 'Admin', email: 'admin@imovies.com', password: 'Admin@123', role: 'admin' },
    { name: 'Demo User', email: 'user@imovies.com', password: 'User@123' },
  ]);

  const movieDocs = await Movie.insertMany(
    movies.map((m, i) => ({ ...m, status: 'now_showing', releaseDate: daysFromNow(-(i + 2) * 3) }))
  );
  const theatreDocs = await Theatre.insertMany(theatres);

  let showCount = 0;
  let seatCount = 0;
  for (let d = 0; d < 6; d++) {
    for (let t = 0; t < theatreDocs.length; t++) {
      for (let sc = 0; sc < theatreDocs[t].screens.length; sc++) {
        for (let s = 0; s < slots.length; s++) {
          const screen = theatreDocs[t].screens[sc];
          const movie = movieDocs[(d + t * 3 + sc * 2 + s) % movieDocs.length];
          const start = new Date();
          start.setDate(start.getDate() + d);
          start.setHours(slots[s][0], slots[s][1], 0, 0);
          if (start <= new Date()) continue;
          const price = [180, 220, 250, 280][(t + s) % 4];
          const show = await Show.create({
            movie: movie._id, theatre: theatreDocs[t]._id, screen: screen.name,
            screenRows: screen.rows, screenCols: screen.cols,
            startTime: start, endTime: new Date(start.getTime() + (movie.duration + 15) * 60000),
            price, premiumPrice: Math.round(price * 1.4),
          });
          const seats = buildSeats(show);
          await Seat.insertMany(seats, { ordered: false });
          showCount += 1;
          seatCount += seats.length;
        }
      }
    }
  }

  console.log(`Seeded ${movieDocs.length} movies, ${theatreDocs.length} theatres, ${showCount} shows, ${seatCount} seats.`);
  console.log('Admin: admin@imovies.com / Admin@123');
  console.log('User:  user@imovies.com / User@123');
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
