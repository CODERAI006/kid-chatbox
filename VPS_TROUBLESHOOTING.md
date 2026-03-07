# 🔧 VPS Troubleshooting Guide - KidChatbox Not Showing

## Quick Fix Commands (Run on VPS)

SSH into your VPS first:
```bash
ssh root@31.97.232.51
cd /var/www/kidchatbox  # or wherever your app is located
```

### Step 1: Stop All Running Processes

```bash
# Stop PM2 processes
pm2 stop all
pm2 delete all

# Kill any dev servers still running
pkill -f "vite"
pkill -f "node.*dev"
```

### Step 2: Rebuild and Start in Production Mode

```bash
# Make sure you're in the project directory
cd /var/www/kidchatbox

# Pull latest changes (if you pushed from local)
git pull origin main

# Install dependencies
npm install

# Build the frontend for production
NODE_ENV=production npm run build

# Start with PM2 in production mode
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on server reboot
pm2 startup
# Follow the command it gives you (usually starts with sudo)
```

### Step 3: Check Status

```bash
# Check PM2 status
pm2 status
pm2 logs kidchatbox-api --lines 50

# Check if server is responding
curl http://localhost:3001/api/health
# or
curl http://localhost:3001
```

### Step 4: Check Nginx Configuration

```bash
# Check nginx status
sudo systemctl status nginx

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

# Check which port nginx is listening on
sudo netstat -tlnp | grep nginx
```

### Step 5: Check Firewall

```bash
# Check if ports are open
sudo ufw status

# If firewall is active, ensure ports are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
```

## Common Issues and Solutions

### Issue 1: "Process or Namespace kidchatbox not found"
**Cause:** PM2 process was never started or was deleted

**Solution:**
```bash
cd /var/www/kidchatbox
pm2 start ecosystem.config.js --env production
pm2 save
```

### Issue 2: App Running on Port 5173 (Dev Mode)
**Cause:** Someone ran `npm run dev` instead of production build

**Solution:**
```bash
# Kill dev server
pkill -f "vite"
pkill -f "node.*5173"

# Start production properly
pm2 start ecosystem.config.js --env production
```

### Issue 3: Website Not Accessible from Browser
**Cause:** Nginx not configured or not running

**Solution:**
```bash
# Check nginx config exists
ls -la /etc/nginx/sites-enabled/

# If no config, create one (see below)
# Restart nginx
sudo systemctl restart nginx
```

### Issue 4: Database Connection Error
**Cause:** .env file not configured properly

**Solution:**
```bash
# Check .env file exists
cat .env | grep DB_

# Make sure these variables are set:
# DB_HOST=localhost
# DB_USER=your_db_user
# DB_PASSWORD=your_db_password
# DB_NAME=kidchatbox
# DB_PORT=5432
```

## Nginx Configuration Template

If Nginx is not configured, create this file:

```bash
sudo nano /etc/nginx/sites-available/kidchatbox
```

Add this content (adjust domain name):

```nginx
server {
    listen 80;
    server_name guru-ai.cloud www.guru-ai.cloud;

    # Serve static files from dist
    root /var/www/kidchatbox/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/kidchatbox/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # React Router - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/kidchatbox /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## DNS Configuration Check

Make sure your domain DNS A record points to your VPS IP:

```
Domain: guru-ai.cloud
Type: A
Value: 31.97.232.51
TTL: 3600 (or Auto)
```

You can check DNS propagation:
```bash
# On VPS
dig guru-ai.cloud
nslookup guru-ai.cloud
```

## Complete Restart Script

Save this as `restart-app.sh` on your VPS:

```bash
#!/bin/bash
cd /var/www/kidchatbox
pm2 stop all
pm2 delete all
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
sudo systemctl restart nginx
echo "✅ App restarted successfully!"
pm2 status
```

Make it executable and run:
```bash
chmod +x restart-app.sh
./restart-app.sh
```

## Useful Monitoring Commands

```bash
# Watch PM2 logs in real-time
pm2 logs kidchatbox-api

# Monitor CPU/Memory usage
pm2 monit

# Check disk space
df -h

# Check memory usage
free -h

# Check running processes
ps aux | grep node

# Check open ports
sudo netstat -tlnp
```

## Need More Help?

1. **Check PM2 logs**: `pm2 logs kidchatbox-api --lines 100`
2. **Check Nginx logs**: `sudo tail -f /var/log/nginx/error.log`
3. **Check system logs**: `sudo journalctl -u nginx -n 50`
4. **Test API directly**: `curl http://localhost:3001/api/health`

## Contact Hostinger Support

If issues persist, contact Hostinger support with:
- VPS IP: 31.97.232.51
- Domain: guru-ai.cloud
- Issue: Node.js application not accessible
- Error logs from: `pm2 logs` and `sudo tail /var/log/nginx/error.log`
