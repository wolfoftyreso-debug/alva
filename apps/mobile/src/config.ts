import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

function required(key: string): string {
  const value = extra[key];
  if (!value) throw new Error(`Missing "${key}" in app.json extra`);
  return value;
}

export const appConfig = {
  apiUrl: required('apiUrl'),
  cognitoDomain: required('cognitoDomain'),
  cognitoClientId: required('cognitoClientId'),
  iosMonthlyProductId: required('iosMonthlyProductId'),
  iosYearlyProductId: required('iosYearlyProductId'),
  androidMonthlyProductId: required('androidMonthlyProductId'),
  androidYearlyProductId: required('androidYearlyProductId'),
};
