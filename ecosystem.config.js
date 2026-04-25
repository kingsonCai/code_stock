module.exports = {
  apps: [
    {
      name: 'code-stock-backend',
      cwd: './backend',
      script: 'dist/app.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      node_args: '--input-type=commonjs',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'code-stock-frontend',
      cwd: './frontend',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --host 0.0.0.0 --port 4173',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
