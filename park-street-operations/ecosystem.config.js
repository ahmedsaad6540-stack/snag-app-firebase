module.exports = {
  apps: [
    {
      name: 'park-street-firestore-emulator',
      script: 'npx',
      args: 'firebase-tools@13.35.1 emulators:start --only firestore --project snag-ops-staging --import=./.emulator-data --export-on-exit=./.emulator-data',
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 15,
      min_uptime: '15s',
      env: {
        NODE_ENV: 'staging',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
      },
      error_file: './logs/emulator-error.log',
      out_file: './logs/emulator-out.log',
      merge_logs: true,
      time: true
    },
    {
      name: 'park-street-slack-bolt',
      script: 'src/app.js',
      cwd: __dirname,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 20,
      min_uptime: '10s',
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'staging',
        SLACK_SOCKET_MODE: 'true',
        FIREBASE_PROJECT_ID: 'snag-ops-staging',
        FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
      },
      error_file: './logs/bolt-error.log',
      out_file: './logs/bolt-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
