# SkyRun Brian Head Income Estimator

A standalone, secure property-income estimator for prospective owners and SkyRun employees.

## What is included

- Email one-time-code verification for prospective owners
- Required name, email, and phone before results
- Passwordless Supabase email-code sign-in for approved employees
- Admin-managed employee access
- Saved estimates protected with Supabase Row Level Security
- Employee lead dashboard
- New-lead email notifications to `brianhead@skyrun.com`
- Print/PDF and CSV export
- Responsive SkyRun and Nudge-branded interface
- Configurable iframe allowlist for future website embedding

## Application stack

- Next.js 16
- React 19
- Supabase Auth and Postgres
- SendGrid email notifications
- Vercel hosting

## Local setup

1. Install packages:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the public Supabase URL and anon/publishable key.

3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor.

4. In Supabase Authentication:

   - Leave the Email provider enabled. Google OAuth is not required.
   - Add `http://localhost:3000/auth/callback` and the production callback URL to allowed redirects.
   - Update the email template so it includes `{{ .Token }}`. Owners and approved employees use this six-digit code.

5. Start the app:

   ```bash
   npm run dev
   ```

When Supabase public environment variables are absent, `/estimate` opens in safe preview mode for visual review. Data is not saved in preview mode.

## Production deployment

Deploy the repository to Vercel and add these environment variables. Vercel automatically assigns a free `*.vercel.app` address, so a custom domain and DNS are optional:

```text
NEXT_PUBLIC_SITE_URL=https://your-vercel-project.vercel.app
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SENDGRID_API_KEY=...
SENDGRID_FROM_EMAIL=estimates@skyrunbrianhead.com
SENDGRID_FROM_NAME=SkyRun Brian Head
LEAD_NOTIFICATION_TO=brianhead@skyrun.com
ALLOWED_FRAME_ANCESTORS='self'
```

No DNS work is needed for the Vercel address. If a custom domain is added later, Vercel will provide the required DNS record.

For future embedding, set:

```text
ALLOWED_FRAME_ANCESTORS='self' https://cedarmountainstays.com https://www.cedarmountainstays.com https://brianhead.skyrun.com
```

Then redeploy.

## Initial administrators

- `matt.malpede@skyrun.com`
- `paula.soria@skyrun.com`
- `alex.soria@skyrun.com`
- `jonelle.rush@skyrun.com`

Admins can add employees from `/admin`. New employees must use a `@skyrun.com` address and sign in using a six-digit email code.

## Security model

The browser never receives a Supabase service-role key. Supabase Row Level Security enforces:

- Owners can read estimates they created or estimates linked to their verified email.
- Employees can read all estimates.
- Only admins can add or deactivate employee access.
- Users cannot promote their own role.

The original static estimator remains in `versions/` for reference. The application uses the extracted calculation model in `lib/estimator.ts`.
