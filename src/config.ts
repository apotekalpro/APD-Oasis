// Environment Configuration
// Detects whether running in production or development/UAT environment

export interface EnvironmentConfig {
  environment: 'production' | 'development';
  isDevelopment: boolean;
  isProduction: boolean;
  projectName: string;
  apiBaseUrl: string;
}

// Detect environment based on hostname
function detectEnvironment(): EnvironmentConfig {
  // Check if running in browser context
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isDev = hostname.includes('apd-oasis-dev') || 
                  hostname.includes('localhost') ||
                  hostname.includes('127.0.0.1') ||
                  hostname.includes('sandbox');
    
    return {
      environment: isDev ? 'development' : 'production',
      isDevelopment: isDev,
      isProduction: !isDev,
      projectName: isDev ? 'apd-oasis-dev' : 'apd-oasis',
      apiBaseUrl: isDev 
        ? 'https://apd-oasis-dev.pages.dev/api'
        : 'https://apd-oasis.pages.dev/api'
    };
  }
  
  // Server-side detection (Cloudflare Workers)
  // Will be replaced by actual environment variables at build time
  const envVar = process.env.ENVIRONMENT || 'production';
  const isDev = envVar === 'development';
  
  return {
    environment: isDev ? 'development' : 'production',
    isDevelopment: isDev,
    isProduction: !isDev,
    projectName: isDev ? 'apd-oasis-dev' : 'apd-oasis',
    apiBaseUrl: isDev 
      ? 'https://apd-oasis-dev.pages.dev/api'
      : 'https://apd-oasis.pages.dev/api'
  };
}

// Export singleton config instance
export const config = detectEnvironment();

// Log environment on startup (development only)
if (config.isDevelopment && typeof console !== 'undefined') {
  console.log(`%c🌍 Environment: ${config.environment.toUpperCase()}`, 'color: #4CAF50; font-weight: bold; font-size: 14px;');
  console.log(`%c📦 Project: ${config.projectName}`, 'color: #2196F3; font-weight: bold;');
  console.log(`%c🔗 API: ${config.apiBaseUrl}`, 'color: #FF9800; font-weight: bold;');
}

export default config;
