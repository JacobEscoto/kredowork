const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const siteUrl = new URL(
  configuredSiteUrl ??
    (productionHost
      ? `https://${productionHost}`
      : "https://kredowork.vercel.app"),
);
