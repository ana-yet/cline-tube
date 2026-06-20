**Movie and Series Rating & Streaming Portal Assignment Requirements**

**Project Overview**

Develop a **Movie and Series Rating Portal** where users can explore, rate, and review movies and TV series. Admins manage the media library (movies/series entries) and moderate user-generated content. Users can rate titles on a 1-10 scale, write reviews, stream and engage with others through comments and likes. The portal will prioritize performance, security, and an intuitive user experience, built using modern full-stack technologies.

* * *

### **Functional Requirements**

### **1\. User Roles**

**User:**

*   Register and log in using email/password or social login.
*   Browse movies/series by genre, streaming platform, release year, or rating.
*   Rate (1-10 stars) and review movies/series.
*   Add spoiler warnings or tags (e.g., "family-friendly") to reviews.
*   Like/unlike reviews and comment on them .
*   Purchase/Rent:
    *   Buy (one-time purchase) or rent (time-limited access) movies/series.
    *   View purchase history and streaming links.
*   Save titles to a personal watchlist.
*   Edit/delete their own reviews (if unpublished).

**Admin:**

*   Manage movies/series in the media library (title, description, genre, release year, director, cast, streaming platform).
*   Approve or unpublish user reviews/comments.
*   View aggregated ratings and reports (e.g., most-reviewed titles).
*   Remove inappropriate content.
*   View sales/rental analytics.
*   Handle refunds/access revocation (optional).

### **2\. Core Features**

**Authentication:**

*   Secure JWT-based authentication with password hashing.
*   Password reset functionality.

**Media Library Management (Admin-Only):**

*   Admins populate and maintain a database of movies/series.
*   Each entry includes: title, synopsis, genre(s), release year, director, cast, and streaming platform(s).
*   Pricing ("premium","free").
*   Streaming link youtube.

**Review System:**

*   Users select a movie/series from the library to review.
*   Submit reviews with:
    *   Rating (1-10 stars).
    *   Written review.
    *   Tags (e.g., "classic," "underrated") and spoiler toggle.
*   Reviews require admin approval before publication.
*   Users can edit/delete unpublished reviews.

**Payment System:**

*   Integration with Stripe/PayPal/Razorpay or any other.
*   Purchase Flow:
    1. User selects "monthly subscription".
    2. Enters payment details (card/mfs wallet).
    3. Receives confirmation email (optional: send email).
       
**Interaction Features:**

*   Like/unlike reviews (one like per user per review).
*   Comment on reviews and reply to comments (nested threads optional).
*   Watchlist: Users save titles to a personal list.

**Search and Filter:**

*   Search by title, genre, director, cast, or streaming platform.
*   Filter by release year, rating range, or popularity.
*   Sort by highest-rated, most-reviewed, or latest releases.

**Dashboard & Analytics (Admin-Only):**

*   View pending reviews, published content, and user activity.
*   See aggregated stats (e.g., average rating per title).

**Responsive Design:**

*   Optimized for all devices (mobile, tablet, desktop).

#### **3\. Pages**

**Home Page:**

*   Displays featured movies/series (highest-rated, trending, or admin-selected).
*   Search bar with filters (genre, streaming platform, release year).
*   Quick-access sections:
    *   "Top Rated This Week"
    *   "Newly Added" (recently added to the library)
    *   "Editor’s Picks" (admin-curated recommendations)
    *   "price card" monthly, yearly, free

**All Movie/Series Page:**

*   Lists all published reviews in a paginated grid/card layout.
*   Sortable by:
    *   Recent (newest first)
    *   Top Rated (highest average rating)
    *   Most Liked (reviews with the most likes)
*   Filterable by:
    *   Genre (e.g., Action, Drama)
    *   Rating range (e.g., 7+ stars)
    *   Streaming platform (e.g., Netflix, Disney+)

**Movie/Series Details Page:**

*   Full review content with:
    *   Movie/series poster, title, and metadata (year, director, cast).
    *   User’s rating (1-10 stars) and written review.
    *   Spoiler warnings (if marked).
    *   Likes count and comment section.
*   Interactive elements:
    *   "Like" button (only for logged-in users).
    *   Comment form (with reply threading optional).
    *   "Add to Watchlist" button.
*   Admin-only actions (if logged in as admin):
    *   "Approve/Unpublish" toggle.
    *   "Delete Review" option.

* * *

### **Non-Functional Requirements:**

*   **Usability:** Clean, intuitive UI/UX for both users and admins.
*   **Maintainability:** Modular, clean, and well-documented code following RESTful API design principles.

* * *

**Important Note:**

This document provides a high-level overview of the core features and pages for the Street Food Finder Website. Add more pages (e.g., About Us, Contact, FAQ, Subscription Plans, User Profile).Think creatively and make the project your own — the more professional and complete your project looks, the better it will be for your portfolio and CV.

### **Technology Stack:**

*   **Frontend:**
    *   **Next.js** (for server-side rendering and static site generation).
    *   **Tailwind CSS** (for utility-first styling).
*   **Backend:**
    *   **Node.js** with **Express.js** (for RESTful API).
    *   **Prisma** (for database management).
*   **Database:**
    *   **PostgreSQL** (for relational data storage).
*   **Authentication:**
    *   **JWT** or **better auth** or **custom ** (for session management).
*   **Payment Integration:**
    *   **SSLCommerz** or **Stripe** (for premium subscriptions).
*   **Deployment:**
    *   Vercel, render, ralway for hosting and deployment.

* * *

### **Submission Guidelines:**

1. **GitHub repository** with a clear README explaining setup and functionality.
2. **Live site links** for both frontend and backend.
3. **Admin credentials** for testing.
4. An **overview video** demonstrating the functionality of the website.