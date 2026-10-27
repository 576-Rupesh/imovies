# iMovies: movie ticket booking made simple

A full-stack MERN cinema booking system. Users browse movies, pick a show, choose seats on a live seat map, pay, and manage their bookings. Admins manage movies, theatres and shows.

**Stack:** MongoDB, Express.js, React (Vite) + Bootstrap, Node.js, Socket.IO, JWT, Redux Toolkit.

## Features

| Area | What is included |
|---|---|
| Accounts | Register, login, JWT sessions, bcrypt password hashing, User and Admin roles |
| Discovery | Search by title/director/actor; filter by genre, language, city, theatre and date; pagination |
| Shows | Movie details, 7-day date strip, shows grouped by theatre with seats-left count |
| Seats | Live seat map (Socket.IO), 5-minute seat hold with countdown, premium rows, max 8 seats |
| Booking | Checkout with card form, demo payment gateway (success and failure paths), booking code and printable ticket |
| After booking | Upcoming and past bookings, cancellation up to 2 hours before the show (seats freed, refund recorded) |
| Alerts | In-app notifications for bookings and cancellations |
| Admin | Stats, movie CRUD with poster upload, theatre and screen CRUD, show scheduling with clash detection |
| Security | Protected routes, role checks, Helmet, CORS, rate limiting, input validation, NoSQL-injection-safe queries |
| Ops | Central error handler, request log (`server/logs/access.log`), MongoDB indexes, pagination |

## Setup

You need Node.js 16+ and MongoDB running locally (or a MongoDB Atlas connection string).

```bash
# 1. API
cd server
cp .env.example .env        # then edit JWT_SECRET (and MONGO_URI if needed)
npm install
npm run seed                # loads demo movies, theatres, shows, seats and two accounts
npm run dev                 # http://localhost:5000

# 2. Web app (second terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

On Windows use `copy .env.example .env` instead of `cp`.

**Demo accounts (created by the seed):**

- Admin: `admin@imovies.com` / `Admin@123`
- User: `user@imovies.com` / `User@123`

**Demo cards (payments are simulated, no real money moves):**

- `4242 4242 4242 4242`, any future expiry, any 3-digit CVV: succeeds
- `4000 0000 0000 0002`: declined by the "bank" (tests the failure path)

### Environment variables (`server/.env`)

| Name | Purpose |
|---|---|
| `PORT` | API port (default 5000) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Allowed CORS origin and Socket.IO origin |
| `SEAT_LOCK_MINUTES` | How long a seat hold lasts (default 5) |

### Production build

```bash
cd client && npm run build      # creates client/dist
cd ../server && npm start       # the API also serves client/dist
```

If the API and web app are on different domains, set `VITE_API_URL` in `client/.env` before building.

## Project structure

```
imovies/
  server/
    server.js            app, middleware, routes, Socket.IO, expired-hold cleanup
    seed.js              demo data
    config/db.js
    models/              User, Movie, Theatre, Show, Seat, Booking, Payment, Notification
    controllers/         auth, movie, theatre, show, booking, notification, admin
    services/            seatService (locking), paymentService (demo gateway)
    middleware/          auth (JWT + roles), rateLimiter, upload (multer), errorHandler
    routes/  utils/
  client/
    src/pages/           Home, MovieDetails, SeatSelection, Checkout, BookingConfirmation,
                         MyBookings, Login, Register, admin/*
    src/components/      Navbar, SeatMap, Poster, MovieCard, Pagination, Countdown, ...
    src/store/           Redux: auth, booking (selection carried to checkout)
```

## Database design

Each booking links a user to a show. A show stores the movie, theatre, screen, timing and prices; its seats live in the `seats` collection (one document per seat per show).

| Collection | Key fields | Indexes |
|---|---|---|
| users | name, email, password (hashed), role | unique email |
| movies | title, genres, language, duration, status, poster | title; status+releaseDate; genres; language |
| theatres | name, city, screens[{name, rows, cols}] | city+name |
| shows | movie, theatre, screen, startTime, endTime, price | movie+startTime; theatre+screen+startTime; startTime+isActive |
| seats | show, label, category, price, status (`available`/`locked`/`booked`), lockedBy, lockedUntil | unique show+label; show+status; status+lockedUntil |
| bookings | bookingCode, user, show, seats[], totalAmount, status | user+showTime; user+createdAt; show+status |
| payments | user, booking, amount, status, transactionId, cardLast4 | user+createdAt; status |
| notifications | user, title, message, read | user+createdAt |

Only the last 4 digits of a card are stored.

## How double-booking is prevented

1. Tapping a seat calls `POST /api/shows/:id/lock`. The server runs one conditional `updateMany` that only matches seats that are free, expired, or already held by the same user. If fewer seats match than requested, the attempt is rolled back and the user is told which seats were taken.
2. Every change is pushed to everyone viewing the show through Socket.IO (`seat:update`).
3. At payment time the server re-checks that the user still holds every seat, charges, then flips `locked` to `booked` with another conditional update. If the hold lapsed mid-payment the charge is marked refunded and no booking is created.
4. A background job releases expired holds every 30 seconds.

## API reference

All responses are JSON: `{ success, ... }`. Protected routes need `Authorization: Bearer <token>`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account |
| POST | `/api/auth/login` | public | Log in, returns token |
| GET | `/api/auth/me` | user | Current user |
| GET | `/api/movies` | public | List; query `q, genre, language, city, theatre, date, status, page, limit` |
| GET | `/api/movies/filters` | public | Genres, languages, cities |
| GET | `/api/movies/:id` | public | Movie details |
| POST / PUT / DELETE | `/api/movies[/:id]` | admin | Create (multipart, `poster` file), update, delete or archive |
| GET | `/api/theatres` | public | List; query `city` |
| POST / PUT / DELETE | `/api/theatres[/:id]` | admin | Manage theatres and screens |
| GET | `/api/shows` | public | List; query `movie, theatre, city, date` |
| GET | `/api/shows/:id` | public | Show and seat map |
| POST / DELETE | `/api/shows[/:id]` | admin | Schedule (generates seats) or delete |
| POST | `/api/shows/:id/lock` | user | Hold seats `{ seats: ["A1","A2"] }` |
| POST | `/api/shows/:id/release` | user | Release all of my holds |
| POST | `/api/bookings` | user | Pay and book `{ showId, seats, payment }` |
| GET | `/api/bookings/my` | user | My bookings; query `type=upcoming|past, page, limit` |
| GET | `/api/bookings/:id` | owner/admin | One booking |
| PUT | `/api/bookings/:id/cancel` | owner | Cancel (at least 2 hours before show) |
| GET / PUT | `/api/notifications`, `/api/notifications/read-all` | user | Alerts |
| GET | `/api/admin/stats`, `/api/admin/bookings` | admin | Dashboard data |

## Testing checklist

Use the app and Postman against `http://localhost:5000/api`.

- [ ] Register, log in, wrong password returns 401, short password returns 400
- [ ] Protected route without a token returns 401; admin route as a normal user returns 403
- [ ] Search, genre, language, city, theatre and date filters narrow the movie list; pagination works
- [ ] Open the same show in two browsers: a seat picked in one turns "held" in the other instantly
- [ ] Hold seats and wait 5 minutes: timer expires and seats are released
- [ ] Pay with `4242 4242 4242 4242`: booking is created and seats become taken
- [ ] Pay with `4000 0000 0000 0002`: error shown, no booking, seats still held
- [ ] Cancel an upcoming booking: seats free up, status becomes cancelled, alert appears
- [ ] Booking within 2 hours of the show cannot be cancelled
- [ ] Admin: add a movie with a poster, add a theatre, schedule a show; scheduling an overlapping show on the same screen is rejected
- [ ] Layout works on a phone-width screen

## Notes and limits

- The payment gateway is a simulation (`server/services/paymentService.js`). Replace it with Razorpay or Stripe for real payments.
- Notifications are in-app only; no email or SMS is sent.
- Date filters use the server's time zone.
- Movie search is a case-insensitive "contains" match for friendly partial typing. For very large catalogues, switch to a MongoDB text or Atlas Search index.
