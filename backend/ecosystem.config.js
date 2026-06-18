module.exports = {
  apps: [
    {
      name: 'seatsip-api',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: '3002',
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: '3002',
      },
      max_memory_restart: '1G',
      kill_timeout: 10000,
      listen_timeout: 5000,
      shutdown_with_message: true,
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      pid_file: 'pids/pm2.pid',
    },
  ],
};
