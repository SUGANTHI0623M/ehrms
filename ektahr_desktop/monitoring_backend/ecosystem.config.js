module.exports = {
  apps: [
    {
      name: 'monitoring-api',
      script: 'index.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M'
    },
    {
      name: 'monitoring-worker',
      script: 'worker.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '500M'
    }
  ]
};
