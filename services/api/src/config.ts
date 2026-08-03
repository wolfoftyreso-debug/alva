/**
 * All runtime configuration in one place. Values come from Lambda environment
 * variables (set by the CDK stack) — secrets never live here.
 */
export const config = {
  /** Number of free messages before the paywall is shown (~5–10 conversations). */
  freeMessageLimit: Number(process.env.FREE_MESSAGE_LIMIT ?? '50'),
  /** Free-tier usage resets after this many days. */
  usageResetDays: Number(process.env.USAGE_RESET_DAYS ?? '30'),
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  /** ARN of the application secret (OpenAI key, store credentials). */
  appSecretArn: process.env.APP_SECRET_ARN ?? '',
  /** ARN of the RDS-managed database credentials secret. */
  dbSecretArn: process.env.DB_SECRET_ARN ?? '',
  dbName: process.env.DB_NAME ?? 'neurosemantics',
  /** Android application id, needed for Google Play purchase verification. */
  androidPackageName: process.env.ANDROID_PACKAGE_NAME ?? 'com.neurosemantics.app',
};
