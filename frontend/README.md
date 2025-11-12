# Romantic Wedding RSVP

An elegant, modern, and accessible application for guests to RSVP to a wedding and for administrators to manage the guest list. Built with React, TypeScript, and a custom CSS component system, this project follows a multi-page architecture without a client-side router.

## Features

- **Guest Flow**: Guests can log in, request access, recover their code, and submit their RSVP.
- **Admin Panel**: Administrators can view a dashboard with KPIs, check event details, and manage the guest list, including importing guests from a CSV file.
- **Internationalization (i18n)**: Supports English, Spanish, and Romanian.
- **Accessibility (WCAG AA)**: Built with accessibility in mind, featuring visible focus states, ARIA attributes, high-contrast colors, and keyboard navigation.
- **Multi-Page Architecture**: Simulates a traditional multi-page website using separate HTML files as entry points, rendered with React.

## Tech Stack

- **React 18**
- **TypeScript**
- **Vite** for building and development
- **Custom CSS**: A token-based, component-oriented CSS system (No frameworks like Tailwind or Bootstrap).

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or a compatible package manager

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd romantic-wedding-rsvp
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```

### Configuration

Configuration is managed through an environment file.

1.  Create a `.env` file in the root of the project:
    ```bash
    touch .env
    ```

2.  Add the following variables to the `.env` file:

    ```env
    # The base URL of your backend API
    VITE_BASE_URL=http://localhost:5000

    # The secret key for accessing admin-only API endpoints
    VITE_ADMIN_KEY=your_secret_admin_key
    ```
    - `VITE_BASE_URL`: The URL where your backend is running.
    - `VITE_ADMIN_KEY`: A secret key required for admin actions, such as importing guests. The application's admin pages will only be accessible if this key is set.

### Running the Development Server

To start the development server, run:

```bash
npm run dev
```

This will start a local server, typically on `http://localhost:5173`.

Because this is a multi-page application, the root URL will default to the login page. To access other pages, you must navigate to their specific HTML files.

**Guest Pages:**
- Login: `http://localhost:5173/app/login.html`
- Request Access: `http://localhost:5173/app/request-access.html`
- Recover Code: `http://localhost:5173/app/recover-code.html`
- RSVP Form (Private): `http://localhost:5173/app/rsvp-form.html`
- Confirmation (Private): `http://localhost:5173/app/confirmed.html`

**Admin Pages (Private):**
- Dashboard: `http://localhost:5173/admin/dashboard.html`
- Event Details: `http://localhost:5173/admin/event.html`
- Guest Management: `http://localhost:5173/admin/guests.html`

## Building for Production

1.  **Build the application:**
    ```bash
    npm run build
    ```
    This command compiles the TypeScript and React code and outputs the static files to the `/dist` directory, preserving the multi-page structure.

2.  **Preview the production build:**
    ```bash
    npm run preview
    ```
    This will serve the contents of the `/dist` folder on a local server, allowing you to test the production-ready application.

## Project Structure

### Page to Component Mapping

The application maps specific HTML entry points to React components. This logic is handled in `index.tsx`.

| HTML File (`/public`)             | React Component (`/src/pages`)             |
| --------------------------------- | ------------------------------------------ |
| `/app/login.html`                 | `LoginPage.tsx`                            |
| `/app/request-access.html`        | `RequestAccessPage.tsx`                    |
| `/app/recover-code.html`          | `RecoverCodePage.tsx`                      |
| `/app/rsvp-form.html`             | `RsvpFormPage.tsx`                         |
| `/app/confirmed.html`             | `ConfirmedPage.tsx`                        |
| `/admin/dashboard.html`           | `AdminDashboardPage.tsx`                   |
| `/admin/event.html`               | `AdminEventPage.tsx`                       |
| `/admin/guests.html`              | `AdminGuestsPage.tsx`                      |

## Accessibility Notes

This project was developed with a strong focus on meeting WCAG AA accessibility standards.

- **Visible Focus**: All interactive elements have a clear and consistent focus indicator (`:focus-visible`) to aid keyboard navigation. The focus ring color is defined by the `--focus-ring-color` CSS token.
- **Semantic HTML**: The application uses semantic HTML5 elements (`<main>`, `<nav>`, `<header>`, etc.). Forms are structured correctly with `<label>`, `<fieldset>`, and `<legend>` to ensure they are understandable by assistive technologies.
- **ARIA Attributes**: ARIA attributes are used where necessary to enhance accessibility. For example, `aria-live="polite"` is used for form error messages to announce them non-intrusively, and `role="alert"` is used for important notifications.
- **Color Contrast**: The color palette defined in `src/styles/tokens.css` was chosen to ensure that all text meets the minimum contrast ratio of 4.5:1 required by WCAG AA.
- **Keyboard Navigation**: The entire application is navigable and usable with only a keyboard.
