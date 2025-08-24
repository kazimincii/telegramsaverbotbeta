module.exports = {
  apps: [
    {
      name: 'telegramsaver',
      script: 'backend/main.py',
      cwd: '../',
      interpreter: 'python3',
      out_file: '../log/pm2-out.log',
      error_file: '../log/pm2-error.log',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
