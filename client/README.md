# Freelancing Platform - React Frontend

A modern React frontend for the Freelancing Platform API, built with Vite, React Router, and Axios.

## Features

### For Freelancers
- Browse available projects
- View project details with full descriptions
- Submit proposals with bid amounts and cover letters
- Track submitted proposals
- Manage profile information

### For Clients
- Create new projects
- View and manage posted projects
- Review freelancer proposals
- Accept or reject proposals
- Track project status

### General Features
- User authentication (Login/Register)
- Role-based navigation (Freelancer vs Client)
- Project filtering by status and type
- Responsive design
- Clean, modern UI

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running on port 5000

## Installation

1. Navigate to the client directory:
```bash
cd client
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
copy .env.example .env
```

4. Update `.env` if your API is running on a different URL:
```env
VITE_API_URL=http://localhost:5000/api
```

## Running the Application

### Development Mode
```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure

```
client/
├── src/
│   ├── components/         # Reusable UI components
│   │   └── Navbar.jsx     # Navigation bar
│   ├── context/           # React Context providers
│   │   └── AuthContext.jsx # Authentication state
│   ├── pages/             # Page components
│   │   ├── Login.jsx      # Login page
│   │   ├── Register.jsx   # Registration page
│   │   ├── Dashboard.jsx  # Browse projects
│   │   ├── ProjectDetail.jsx # Project details & proposal submission
│   │   ├── MyProposals.jsx # Freelancer proposals list
│   │   ├── MyProjects.jsx  # Client projects management
│   │   ├── CreateProject.jsx # Create new project
│   │   └── Profile.jsx    # User profile
│   ├── services/          # API integration
│   │   └── api.js         # Axios configuration & API endpoints
│   ├── App.jsx            # Main app component with routing
│   ├── index.jsx          # Entry point
│   └── index.css          # Global styles
├── index.html             # HTML template
├── vite.config.js         # Vite configuration
└── package.json           # Dependencies
```

## Usage Guide

### First Time Setup

1. **Start the Backend API** (see main README.md)
   ```bash
   # From the root directory
   npm run dev
   ```

2. **Start the Frontend** (from client directory)
   ```bash
   npm run dev
   ```

3. **Register a New Account**
   - Navigate to [http://localhost:3000/register](http://localhost:3000/register)
   - Choose your role (Freelancer or Client)
   - Fill in the registration form
   - Submit to create your account

### As a Freelancer

1. **Browse Projects**
   - View all available projects on the dashboard
   - Filter by status and project type
   - Click on any project to view details

2. **Submit Proposals**
   - On the project detail page, click "Submit Proposal"
   - Enter your bid amount (for fixed price) or hourly rate
   - Write a cover letter explaining your qualifications
   - Submit the proposal

3. **Manage Proposals**
   - Navigate to "My Proposals" from the navbar
   - View all submitted proposals and their status
   - Withdraw pending proposals if needed

### As a Client

1. **Create Projects**
   - Click "Create New Project" from My Projects page or navbar
   - Fill in project details (title, description, budget, etc.)
   - Submit to post the project

2. **Manage Projects**
   - Navigate to "My Projects" from the navbar
   - View all your posted projects
   - Click "View Proposals" to see freelancer submissions
   - Accept or reject proposals
   - Delete projects that are no longer needed

3. **Review Proposals**
   - Click "View Proposals" on any project
   - Review freelancer bids, rates, and cover letters
   - Accept a proposal to start the project
   - Reject proposals that don't fit your needs

## API Integration

The frontend communicates with the backend API using Axios. All API calls are centralized in [src/services/api.js](src/services/api.js).

### Available API Endpoints

- **Users**: GET, POST, PATCH, DELETE `/api/users`
- **Projects**: GET, POST, PATCH, DELETE `/api/projects`
- **Proposals**: GET, POST, PATCH, DELETE `/api/proposals`

### Authentication

Authentication is handled client-side using localStorage to persist user data. In a production environment, you would implement proper JWT tokens or session-based authentication.

## Styling

The application uses vanilla CSS with a mobile-first, responsive design approach. All styles are in [src/index.css](src/index.css).

### Color Scheme
- Primary: `#3498db` (Blue)
- Success: `#27ae60` (Green)
- Danger: `#e74c3c` (Red)
- Dark: `#2c3e50` (Navy)
- Light: `#f5f5f5` (Gray)

## Development Notes

### State Management
- Global auth state is managed using React Context
- Local component state uses React useState hooks

### Routing
- Uses React Router v6 for navigation
- Protected routes redirect to login if not authenticated
- Role-based routing for freelancer/client specific pages

### Form Validation
- HTML5 form validation is used
- Server-side errors are displayed to users
- Success messages confirm completed actions

## Future Enhancements

- Real-time notifications
- File upload for project attachments
- Advanced search and filtering
- Messaging system between clients and freelancers
- Payment integration
- Review and rating system
- Profile picture uploads

## Troubleshooting

### Common Issues

1. **API Connection Failed**
   - Ensure backend is running on port 5000
   - Check VITE_API_URL in .env file
   - Verify CORS is enabled in backend

2. **Login Not Working**
   - Check browser console for errors
   - Verify user exists in database
   - Ensure backend API is accessible

3. **Blank Page After Login**
   - Check browser console for errors
   - Clear localStorage and try again
   - Verify API responses in Network tab

## Contributing

When adding new features:
1. Create components in appropriate directories
2. Update routing in App.jsx
3. Add API endpoints to services/api.js
4. Update this README with new features

## License

ISC
