/**
 * PM2 Ecosystem Configuration
 * Used for process management in production
 */
module.exports = {
  apps: [
    {
      name: 'kidchatbox-api',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        SKIP_STARTUP_MIGRATIONS: '1',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      kill_timeout: 5000,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: 5000,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
    },
  ],
};

