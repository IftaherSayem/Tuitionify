# 🎓 Tuitionify

A university-based **tuition marketplace** built for **International Islamic University Chittagong (IIUC)**. University-student **tutors** offer tuition, while **guardians and students** post tuition requests and hire them.

Built as a full-stack course project with a professional, responsive UI.

---

## ✨ Features

- **Two roles** — *Tutor* (university student) and *Seeker* (guardian/student), chosen at signup.
- **Firebase Authentication** — Email/Password **and** Google sign-in.
- **Post & apply** — seekers post tuitions; tutors browse and apply; seekers review applicants and accept/reject.
- **Search & filters** — filter tuitions **and** tutors by subject, class level, area/thana, salary range, gender preference, and mode (home/online).
- **Reviews & ratings** — seekers rate tutors (1–5 ★); tutor profiles show an average rating.
- **Role-based dashboards** — tutors manage their profile & applications; seekers manage their posts & applicants.
- **Bangladeshi context** — BDT (৳) monthly salary, Chittagong areas/thanas (IIUC), BD class system (Class 1–12, SSC, HSC, Admission), BD curriculum subjects.
- Fully **responsive / mobile-first**, toast notifications, loading & empty states.

---

## 🧱 Tech Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React (Vite), React Router, Tailwind CSS, Axios, lucide-react, react-hot-toast |
| Backend   | Node.js, Express |
| Database  | MongoDB Atlas (Mongoose) |
| Auth      | Firebase Authentication + Firebase Admin (server-side token verification) |

```
tuitionify/
├── client/   # React frontend (Vite)
└── server/   # Express REST API
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A **MongoDB Atlas** account (free tier is fine)
- A **Firebase** project

### 1. Clone & install

```bash
# from the tuitionify/ folder
cd server && npm install
cd ../client && npm install
```

### 2. Set up Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com/) → **Add project**.
2. **Build → Authentication → Get started** → enable **Email/Password** and **Google**.
3. **Project settings → General → Your apps → Web app (`</>`)** → register an app and copy the config values.
4. **Project settings → Service accounts → Generate new private key** → download the JSON (used by the backend).

### 3. Set up MongoDB Atlas

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas).
2. **Database Access** → add a database user (username + password).
3. **Network Access** → allow your IP (or `0.0.0.0/0` for development).
4. **Connect → Drivers** → copy the connection string.

### 4. Configure environment variables

**Server** — copy `server/.env.example` to `server/.env` and fill in:

```bash
cd server
cp .env.example .env
```

| Variable | Where it comes from |
|----------|---------------------|
| `MONGODB_URI` | Atlas connection string (add your password) |
| `FIREBASE_PROJECT_ID` | service-account JSON → `project_id` |
| `FIREBASE_CLIENT_EMAIL` | service-account JSON → `client_email` |
| `FIREBASE_PRIVATE_KEY` | service-account JSON → `private_key` (keep the `\n`, wrap in quotes) |
| `CLIENT_URL` | Frontend URL (e.g. `http://localhost:5173` or `https://iiuc-tuitionify.vercel.app`) |
| `RESEND_API_KEY` | Resend Dashboard → API Keys (`re_...`) |
| `RESEND_FROM` | Verified sender (e.g. `Tuitionify <noreply@tuitionify.publicvm.com>`) |

**Client** — copy `client/.env.example` to `client/.env` and paste your Firebase **web app** config:

```bash
cd ../client
cp .env.example .env
```

### 5. (Optional) Seed demo data

Loads sample tutors, tuitions, and reviews so the app looks alive for your demo:

```bash
cd server
npm run seed
```

> Demo accounts use fake UIDs and **cannot log in** — they only populate the listings. Create real accounts through the signup page.

### 6. Run the app

Open two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev      # http://localhost:5000

# Terminal 2 — frontend
cd client && npm run dev      # http://localhost:5173
```

Visit **http://localhost:5173**.

---

## 🔌 API Overview

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/send-verification` | Firebase | Generate & send custom verification email via Resend (1/min) |
| POST | `/auth/send-password-reset` | — | Generate & send custom password reset email via Resend (anti-enumeration) |
| POST | `/users/register` | Firebase | Create Mongo profile after signup |
| GET  | `/users/me` | Firebase | Current profile |
| PUT  | `/users/me` | Firebase | Update profile |
| GET  | `/users/tutors` | — | List/filter tutors |
| GET  | `/users/tutors/:id` | — | Tutor + reviews |
| GET  | `/tuitions` | — | List/filter tuitions |
| GET  | `/tuitions/:id` | — | Single tuition |
| POST | `/tuitions` | Seeker | Post a tuition |
| GET  | `/tuitions/mine/posted` | Seeker | My posts |
| PATCH| `/tuitions/:id/status` | Owner | Open/close |
| GET  | `/tuitions/:id/applications` | Owner | Applicants |
| POST | `/applications` | Tutor | Apply to a tuition (requires a saved mobile number) |
| GET  | `/applications/mine` | Tutor | My applications |
| PATCH| `/applications/:id` | Owner | Accept/reject |
| DELETE| `/applications/:id` | Tutor | Withdraw own application (while pending) |
| POST | `/reviews` | Seeker | Review a tutor you hired or who approved your contact request |
| GET  | `/reviews/tutor/:id` | — | Tutor reviews (paginated) |

Protected routes expect a `Authorization: Bearer <firebase-id-token>` header (the frontend attaches this automatically).

List endpoints return `{ data, page, totalPages, total }` and accept `?page=` and `?limit=`.

---

## ✉️ Custom Authentication & Email Flow (Resend + Firebase)

Tuitionify uses **Firebase Authentication** for account management alongside **Firebase Admin SDK** and **Resend** to deliver branded, responsive emails with high deliverability.

### 1. Email Verification Flow
1. **Signup**: User registers with Email & Password in React (`Register.jsx`).
2. **Account & Profile Creation**: Firebase user created via `createUserWithEmailAndPassword`; Mongo profile created via `POST /api/users/register`.
3. **Link Generation**: Client calls `POST /api/auth/send-verification` with Firebase ID token.
4. **Firebase Admin Link**: Backend validates token, calls `admin.auth().generateEmailVerificationLink(email, { url: '${CLIENT_URL}/auth/action' })`.
5. **Resend Delivery**: Branded HTML template is sent via Resend from `Tuitionify <noreply@tuitionify.publicvm.com>`.
6. **Confirmation**: Clicking the link opens `https://iiuc-tuitionify.vercel.app/auth/action?mode=verifyEmail&oobCode=...`, calling `applyActionCode(auth, oobCode)`.
7. **Protection**: `ProtectedRoute.jsx` blocks unverified email users from accessing protected sections (`/dashboard`, `/post-tuition`, etc.) and redirects them to `/verify-email`. Google sign-in accounts are automatically verified by Firebase.

### 2. Password Reset Flow
1. **Request**: User enters email on login page and clicks "Forgot password?".
2. **Endpoint**: Frontend sends `POST /api/auth/send-password-reset` with `{ email }`.
3. **Anti-Enumeration**: Backend generates link via `admin.auth().generatePasswordResetLink(email, { url: '${CLIENT_URL}/auth/action' })` and delivers it via Resend. If the email is not found, it catches the error silently and **always returns the same generic success message**:
   > *"If an account exists for this email, a password reset link has been sent."*
4. **Reset**: User clicks the email link to open `/auth/action?mode=resetPassword&oobCode=...`, enters a new password, and calls `confirmPasswordReset(auth, oobCode, newPassword)`.

### 3. Security Rules Enforced
- **Strictly Server-Side Secrets**: `RESEND_API_KEY` exists **only** in the server environment. It is never exposed in client code, VITE environment variables, or Git.
- **Identity Verification**: Verification emails derive the recipient's UID and email solely from the cryptographically verified Firebase ID token (`req.firebaseUser`).
- **Rate Limiting**:
  - Verification emails: 1 request per 60 seconds per user (`auth-verify-email`).
  - Password resets: 5 requests per 15 minutes (`auth-password-reset`).

---

### Trust & safety rules enforced by the API

- **Reviews require a real engagement** — a seeker may only rate a tutor they accepted on their own tuition, or who approved their contact request. Both need an action by the tutor, so ratings cannot be farmed with throwaway accounts.
- **Reviews and reports require a confirmed email address.**
- **Applying requires a valid BD mobile number** (`01XXXXXXXXX`), since hiring here ends on a phone call.
- **Restricted users are treated as logged-out** everywhere, including on public pages that show extra data to signed-in visitors.
- **Contact details are removed server-side**, not merely hidden in the UI.

---

## 🗂️ Data Models

- **User** — `firebaseUid`, `name`, `email`, `role`, plus tutor fields (`university`, `department`, `subjects`, `classLevels`, `preferredAreas`, `expectedSalary`, `mode`, `bio`, `ratingAvg`, `ratingCount`).
- **Tuition** — `title`, `classLevel`, `subjects`, `area`, `salary`, `daysPerWeek`, `mode`, `genderPreference`, `status`, `createdBy`.
- **Application** — `tuition`, `tutor`, `message`, `status`.
- **Review** — `tutor`, `author`, `authorName`, `rating`, `comment`.

---

## 🎨 Customising for your university

- **Areas / thanas** and **subjects / class levels** live in `client/src/data/options.js` — edit these lists to match your city and curriculum.
  > ⚠ The API validates against the same lists in `server/utils/options.js`. The two files are deliberate duplicates (client and API deploy as separate Vercel projects, so there is no shared import). **Edit both**, or the API will reject values the UI offers.
- Branding colors are in `client/tailwind.config.js` (`brand` palette).
- Replace "Your University" placeholders with your institution's name.

---

## ✅ Tests

The API has a Vitest suite covering the rules that protect the marketplace —
who may review a tutor, the auth guards, BD phone handling, and the query
sanitizers. No database required.

```bash
cd server
npm test          # single run
npm run test:watch
```

---

## 📦 Deployment (Vercel)

The client and API deploy as **two separate Vercel projects** from this one repository.

**API** — import the repo → set **Root Directory** to `server`, framework preset **Other** → add every `server/.env` variable (paste `FIREBASE_PRIVATE_KEY` with its `\n` sequences intact). After the client is live, set `CLIENT_URL` to the client's URL and redeploy.

**Client** — import the repo again → set **Root Directory** to `client`, framework preset **Vite** → add every `VITE_*` variable, with `VITE_API_URL` pointing at `<your-api-url>/api`.

Finally, add the client's domain under **Firebase Console → Authentication → Settings → Authorized domains** so login works in production.

Local production build:

```bash
cd client && npm run build   # outputs to client/dist
```

---

## 📝 Notes

- In-app messaging is intentionally out of scope; the schema leaves room to add it.
- This is an educational project built for a specific university community.

Made with ❤️ in Bangladesh.
