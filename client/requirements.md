## Packages
date-fns | Required for date formatting and date picker
react-day-picker | Required for date selection UI
recharts | For dashboard analytics charts

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["var(--font-sans)"],
  display: ["var(--font-display)"],
}

The backend API returns all shipments via GET /api/shipments. Filtering by status is handled client-side for immediate feedback and simplicity, given the provided API contract doesn't specify query parameters for status filtering.
