/**
 * All runtime configuration in one place. Values come from Lambda environment
 * variables (set by the CDK stack) — secrets never live here.
 */
export const config = {
  /**
   * Abuse backstop, NOT the paywall. The paywall is intelligent: the model
   * decides when an analysis is ready. This cap only bounds how many free
   * messages a single user/device can send per reset window.
   */
  messageCap: Number(process.env.MESSAGE_CAP ?? '200'),
  /** Free-tier usage resets after this many days. */
  usageResetDays: Number(process.env.USAGE_RESET_DAYS ?? '30'),
  openAiModel: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
  /** ARN of the application secret (OpenAI key, store credentials). */
  appSecretArn: process.env.APP_SECRET_ARN ?? '',
  /** ARN of the RDS-managed database credentials secret. */
  dbSecretArn: process.env.DB_SECRET_ARN ?? '',
  dbName: process.env.DB_NAME ?? 'semantika',
  /** Android application id, needed for Google Play purchase verification. */
  androidPackageName: process.env.ANDROID_PACKAGE_NAME ?? 'com.semantika.app',
};
