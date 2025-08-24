#!/bin/bash
set -e

SERVICE_FILE="$(dirname "$0")/../telegramsaver.service"
PM2_FILE="$(dirname "$0")/../ecosystem.config.js"
LOGROTATE_FILE="$(dirname "$0")/../logrotate/telegramsaver"

# Check systemd service file
[ -f "$SERVICE_FILE" ]
grep -q 'ExecStart=/usr/bin/pm2 start' "$SERVICE_FILE"
grep -q 'Environment=LOG_DIR=%h/telegramsaverbotbeta/log' "$SERVICE_FILE"
grep -q 'StandardOutput=append:${LOG_DIR}/telegramsaver.log' "$SERVICE_FILE"
grep -q 'StandardError=append:${LOG_DIR}/telegramsaver.err.log' "$SERVICE_FILE"

# Check PM2 config
[ -f "$PM2_FILE" ]
grep -q "out_file: '../log/pm2-out.log'" "$PM2_FILE"
grep -q "error_file: '../log/pm2-error.log'" "$PM2_FILE"

# Check logrotate config
[ -f "$LOGROTATE_FILE" ]
grep -q '/log/' "$LOGROTATE_FILE"

echo "All service configuration scripts are in place."
