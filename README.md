# Streaming Web Application

A full-stack Netflix-like streaming platform built with Node.js, Express, MongoDB, and EJS. It implements user management, content discovery, personalized recommendations, and viewing habits tracking.

*This project was developed as part of the Colman Web Applications course.*

**Authors**: Gilad Tidhar, Rotem Batstein and Shani Bashari

## Features

- **User Authentication & Profile Management**: Multi-user support with individual profiles per account
- **Content Management**: Movies and TV shows with detailed metadata, genres, and ratings
- **Personalized Feed**: Dynamic content recommendations based on user preferences and viewing history, including dedicated movie/show views.
- **Viewing Habits**: Track what users watch, like, and add to their watchlist
- **Genre-Based Discovery**: Browse content by genres with advanced filtering (watched/unwatched) and sorting by popularity, rating and relese date.
- **Search Functionality**: Find content across the entire database
- **Admin Panel**: Content upload and management capabilities
- **Responsive Design**: Mobile-friendly interface with Netflix-like UI/UX
- **Cloud Storage**: AWS S3 integration for media assets
- **External API Integration**: OMDB API for movie/TV show metadata

## Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Frontend**: EJS templating, Bootstrap 5, Vanilla JavaScript
- **Cloud Storage**: AWS S3
- **External APIs**: OMDB API for content metadata
- **Authentication**: bcrypt for password hashing
- **File Processing**: Multer, Sharp for image handling

## Installation & Setup

### Prerequisites

- Node.js (v16 or higher)
- MongoDB database (local or cloud)
- AWS S3 bucket (for media storage)
- OMDB API key

### 1. Clone the Repository

```bash
git clone https://github.com/giladd123/Colman-Web-Apps.git
cd Colman-Web-Apps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` file with your credentials:
```bash
PORT=8000
MONGO_URI=mongodb+srv://<username>:<password>@webcluster.ywjnajg.mongodb.net/Netflix?retryWrites=true&w=majority
S3_BUCKET_NAME=your-s3-bucket-name
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
OMDB_API_KEY=your-omdb-api-key
SESSION_SECRET=replace-with-secure-random-string
GENRE_CONTENT_LIMIT=12
```

### 4. Start the Application

```bash
node index.js
```

The application will be available at `http://localhost:8000`

## Project Structure

```
├── config/                     # Configuration files
│   ├── db.js                   # MongoDB connection
│   └── media.js                # AWS S3 setup
├── controllers/                # Business logic and API handlers
│   ├── contentController.js    # Admin CRUD and validation helpers
│   ├── feedController.js       # Personalized recommendations & catalog feed
│   ├── genreController.js      # Genre filtering & browsing
│   ├── imdbController.js       # IMDb/OMDb integration helpers
│   └── ...                     # Habits, likes, profiles, users, etc.
├── middleware/                 # Express middleware
│   ├── auth.js                 # Session redirect helpers
│   ├── authMiddleware.js       # Session/auth checks
│   ├── errorHandler.js         # Global error handling
│   ├── imdbErrorHandler.js     # OMDb-specific error handling
│   ├── loadProfile.js          # Inject active profile into requests
│   ├── validateAdmin.js        # Admin gatekeeping
│   ├── validateUser.js         # User payload validation
│   └── ...                     # Additional profile/habit validators
├── models/                     # MongoDB schemas
│   ├── user.js                 # User authentication
│   ├── profile.js              # User profiles
│   ├── content.js              # Movies/shows
│   └── habit.js                # Viewing habits tracking
├── public/                     # Static frontend assets
│   ├── scripts/                # Client-side feature modules
│   ├── style/                  # CSS stylesheets
│   └── images/                 # Static images
├── routes/                     # API route definitions
│   └── *Routes.js              # Route handlers for each feature
├── views/                      # EJS templates
│   ├── feed.ejs                # Main dashboard
│   ├── genre.ejs               # Genre browsing page
│   └── partials/               # Reusable template components
├── utils/                      # Helper utilities
│   ├── apiResponse.js          # Standardized responses
│   └── logger.js               # Application logging
└── index.js                    # Application entry point
```

## Main Features & Functionality

### User Management
- User registration and authentication
- Multiple profiles per user account
- Profile avatar management with S3 storage

### Content Discovery
- **Main Feed**: Personalized recommendations based on viewing history
- **Genre Browsing**: Filter content by genres with sorting options
- **Search**: Global content search functionality
- **Watchlist**: Save content for later viewing

### Viewing Experience
- **Habit Tracking**: Record what users watch and completion status
- **Likes System**: Like/unlike content for better recommendations
- **Continue Watching**: Resume partially watched content
- **Watch Again**: Easy access to completed content

### Admin Features
- Content upload and management
- Metadata integration with OMDB API
- Image processing and optimization

### Technical Features
- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error logging and user feedback
- **Performance**: Pagination and lazy loading for large datasets
- **Security**: Input validation and secure password handling

## API Endpoints

### Authentication
- `POST /api/user/register` - User registration
- `POST /api/user/login` - User login

### Profiles
- `GET /api/profiles/:userId` - Get user profiles
- `POST /api/profiles` - Create new profile
- `PUT /api/profiles/:profileId` - Update profile

### Content
- `GET /feed/allContent` - Retrieve the full catalog for discovery and admin tooling
- `GET /feed/profile/:profileId` - Personalized feed (supports optional `type=Movie|Show` query)
- `GET /feed/genre/:genre` - Feed-sourced genre listing
- `GET /genres/api/genres` - Get all genres
- `GET /genres/api/genres/:genre` - Get content by genre
- `GET /genres/:genre` - Genre page view

### Interactions
- `POST /api/likes` - Like/unlike content
- `POST /api/watchlist` - Add/remove from watchlist
- `POST /api/habits` - Track viewing habits