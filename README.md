This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Backend Data Pipeline (Google Cloud Functions)

The data pipeline fetches 6 distinct views from the Finviz Elite API, merges the data, and stores historical snapshots and pre-aggregated industry/sector averages into BigQuery. 

It uses the `tenacity` library to ensure atomic processing—if the API fails due to rate-limiting or an empty response across all retries, the job fails entirely to prevent partial data writes to BigQuery.

### Secret Management (Action Required for Production)
The pipeline relies on a Finviz Elite API key. In your local development, this is stored in `.env.local` as `FINVIZ_API_KEY`. 

When deploying the Python script as a Cloud Function via the `gcloud` CLI or `cloudbuild.yaml`, **do not pass the API key as a plain text environment variable**.

1. Navigate to Google Cloud Secret Manager.
2. Create a secret named `FINVIZ_API_KEY` and paste your key.
3. Grant the Cloud Function Service Account the `Secret Manager Secret Accessor` role.
4. Update your Cloud Function deployment to expose the secret as an environment variable to the function:
   `--set-secrets="FINVIZ_API_KEY=FINVIZ_API_KEY:latest"`

### Security & IAM Roles (Important)
The Next.js frontend uses a Google Cloud Service Account to read data from BigQuery dynamically. 
To adhere to the principle of least privilege and prevent data manipulation (even though the frontend utilizes parameterized queries), ensure that the Service Account associated with `GCP_CLIENT_EMAIL` **only** has the following two roles bound to the specific `stock_data` dataset:
1. `roles/bigquery.dataViewer`
2. `roles/bigquery.jobUser`

Do **not** grant this account Editor or Owner permissions.
