import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

interface Config {
  server: {
    port: number;
    node_env: string;
  };
  cors: {
    origin: string | string[];
  };
  pipecat: {
    api_key?: string;
    agent_name: string;
    webhook_url: string;
  };
  websocket: {
    path: string;
  };
  logging: {
    level: string;
    cloudwatch: boolean;
  };
  health: {
    path: string;
    interval: number;
  };
  features: {
    voice_mode: boolean;
    practice_mode: boolean;
    debug_mode: boolean;
  };
}

class ConfigManager {
  private config: Config;
  private secretsClient: SecretsManagerClient | null = null;

  constructor() {
    const env = process.env.NODE_ENV || 'development';
    const configPath = path.join(__dirname, '../../config', `${env}.yml`);
    
    // Load YAML config file
    try {
      const fileContents = fs.readFileSync(configPath, 'utf8');
      this.config = yaml.load(fileContents) as Config;
      console.log(`Loaded ${env} configuration from ${configPath}`);
    } catch (error) {
      console.error(`Failed to load config file: ${configPath}`, error);
      // Fall back to environment variables
      this.config = this.loadFromEnv();
    }

    // Initialize AWS Secrets Manager client if in production
    if (env === 'production') {
      this.secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
    }
  }

  private loadFromEnv(): Config {
    return {
      server: {
        port: parseInt(process.env.PORT || '3051'),
        node_env: process.env.NODE_ENV || 'development'
      },
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000'
      },
      pipecat: {
        api_key: process.env.PIPECAT_API_KEY,
        agent_name: process.env.PIPECAT_AGENT_NAME || 'my-first-agent',
        webhook_url: process.env.WEBHOOK_URL || ''
      },
      websocket: {
        path: '/'
      },
      logging: {
        level: process.env.LOG_LEVEL || 'info',
        cloudwatch: process.env.CLOUDWATCH_LOGGING === 'true'
      },
      health: {
        path: '/health',
        interval: 30
      },
      features: {
        voice_mode: process.env.FEATURE_VOICE_MODE !== 'false',
        practice_mode: process.env.FEATURE_PRACTICE_MODE !== 'false',
        debug_mode: process.env.DEBUG_MODE === 'true'
      }
    };
  }

  async loadSecrets(): Promise<void> {
    if (!this.secretsClient) {
      // In development, just use environment variables
      this.config.pipecat.api_key = process.env.PIPECAT_API_KEY;
      return;
    }

    try {
      // Load secrets from AWS Secrets Manager
      const command = new GetSecretValueCommand({
        SecretId: 'flashcard-app/production'
      });
      
      const response = await this.secretsClient.send(command);
      
      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        
        // Override config with secrets
        this.config.pipecat.api_key = secrets.PIPECAT_API_KEY;
        
        // Add any other secrets as needed
        if (secrets.DAILY_API_KEY) {
          // Store in config if needed
        }
        
        console.log('Successfully loaded secrets from AWS Secrets Manager');
      }
    } catch (error) {
      console.error('Failed to load secrets from AWS Secrets Manager:', error);
      // Fall back to environment variables
      this.config.pipecat.api_key = process.env.PIPECAT_API_KEY;
    }
  }

  get(key: string): any {
    const keys = key.split('.');
    let value: any = this.config;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) break;
    }
    
    // Allow environment variables to override
    const envKey = key.toUpperCase().replace(/\./g, '_');
    return process.env[envKey] || value;
  }

  getConfig(): Config {
    return this.config;
  }

  // Helper methods for common access patterns
  getPort(): number {
    return parseInt(process.env.PORT || String(this.config.server.port));
  }

  getCorsOrigin(): string | string[] {
    return process.env.CORS_ORIGIN || this.config.cors.origin;
  }

  getPipecatApiKey(): string | undefined {
    return process.env.PIPECAT_API_KEY || this.config.pipecat.api_key;
  }

  getWebhookUrl(): string {
    const url = process.env.WEBHOOK_URL || this.config.pipecat.webhook_url;
    
    // Replace ${ALB_URL} placeholder if present
    if (url.includes('${ALB_URL}')) {
      const albUrl = process.env.ALB_URL || `http://localhost:${this.getPort()}`;
      return url.replace('${ALB_URL}', albUrl);
    }
    
    return url;
  }

  isProduction(): boolean {
    return this.config.server.node_env === 'production';
  }

  isFeatureEnabled(feature: keyof Config['features']): boolean {
    return this.config.features[feature];
  }
}

// Singleton instance
const configManager = new ConfigManager();

export default configManager;