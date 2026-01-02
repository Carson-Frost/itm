# ITM Scouting

Fantasy football and NFL scouting analytics platform.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env.local` file in the root directory with your Firebase configuration:
```bash
cp .env.local.example .env.local
```

3. Add your Firebase project credentials to `.env.local`:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project
   - Go to Project Settings > General
   - Scroll down to "Your apps" and select your web app
   - Copy the config values to your `.env.local` file

4. Set up Firebase Authentication:
   - In Firebase Console, go to Authentication > Sign-in method
   - Enable "Email/Password" provider
   - Enable "Google" provider
   - Add your domain to authorized domains

5. Set up Firestore Database:
   - In Firebase Console, go to Firestore Database
   - Create database in production mode
   - Deploy the security rules from `firestore.rules` to protect user data

## Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```
