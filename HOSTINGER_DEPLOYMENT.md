# 🚀 Hostinger Deployment Guide

Complete guide to deploy KidChatbox application to Hostinger VPS/Cloud hosting.

## 📋 Prerequisites

1. **Hostinger Account** with VPS or Cloud hosting plan
   - Node.js applications require VPS or Cloud hosting (not shared hosting)
   - Minimum requirements: 1GB RAM, 1 CPU core

2. **Domain Name** (optional but recommended)
   - Point your domain to Hostinger's nameservers

3. **SSH Access** to your Hostinger server
   - Get SSH credentials from Hostinger control panel

## 🔧 Step 1: Server Setup

### Connect to Your Server

```bash
ssh root@your-server-ip
# Or
ssh username@your-server-ip
```

### Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (LTS version)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### Setup Remote PostgreSQL Database Connection

Since you're using a remote PostgreSQL server, you'll configure the connection via environment variables.

**Option 1: Using Remote PostgreSQL Server (Recommended)**

1. **Ensure your remote PostgreSQL server allows remote connections:**
   - On your PostgreSQL server, edit `postgresql.conf`:
     ```bash
     listen_addresses = '*'  # or specific IP
     ```
   - Edit `pg_hba.conf` to allow connections from your Hostinger server IP:
     ```
     host    all    all    YOUR_HOSTINGER_IP/32    md5
     ```

2. **Test remote connection from Hostinger server:**
   ```bash
   # Install PostgreSQL client (for testing only)
   sudo apt install -y postgresql-client
   
   # Test connection (replace with your remote DB details)
   psql -h YOUR_REMOTE_DB_HOST -p 5432 -U YOUR_DB_USER -d kidchatbox
   ```

**Option 2: Using Local PostgreSQL (If you want to install locally)**

If you prefer to install PostgreSQL on the Hostinger server:

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE kidchatbox;
CREATE USER kidchatbox_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE kidchatbox TO kidchatbox_user;
\q

# Test connection
psql -U kidchatbox_user -d kidchatbox -h localhost
```

## 📦 Step 2: Deploy Application

### Clone Repository

```bash
# Navigate to web directory
cd /var/www
# Or create your preferred directory
sudo mkdir -p /var/www/kidchatbox
cd /var/www/kidchatbox

# Clone your repository
git clone https://github.com/CODERAI006/kid-chatbox.git .
# Or upload files via SFTP/FTP
```

### Install Dependencies

```bash
cd /var/www/kidchatbox

# Install ALL dependencies (including devDependencies needed for building)
npm install

# Note: We need devDependencies (TypeScript, Vite) to build the frontend
# After building, you can optionally remove them to save space:
# npm prune --production
```

### Build Frontend

```bash
# Build the React frontend (requires TypeScript and Vite from devDependencies)
npm run build

# Verify build was successful
ls -la dist/
```

**Important:** The build process requires devDependencies (`typescript`, `vite`). After building, you can optionally remove devDependencies to save disk space, but it's not required since they're only used during build time.

### Create Production Environment File

```bash
nano .env
```

Add the following content (update with your actual values):

```env
# Database Configuration
# For REMOTE PostgreSQL server (update with your remote server details):
DB_HOST=your-remote-postgres-host.com  # or IP address like 192.168.1.100
DB_PORT=5432
DB_NAME=kidchatbox
DB_USER=your_remote_db_user
DB_PASSWORD=your_remote_db_password

# For LOCAL PostgreSQL server (if installed locally):
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=kidchatbox
# DB_USER=kidchatbox_user
# DB_PASSWORD=your_secure_password_here

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your-production-jwt-secret-min-32-chars-long

# OpenAI
VITE_OPENAI_API_KEY=sk-your-openai-api-key

# Frontend URL (your domain)
VITE_FRONTEND_URL=https://yourdomain.com
VITE_API_BASE_URL=https://yourdomain.com/api

# Google OAuth (if using)
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Important:** Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Test Remote Database Connection

**Before proceeding, test your remote database connection:**

```bash
# Install PostgreSQL client for testing
sudo apt install -y postgresql-client

# Test connection (replace with your actual remote DB details)
psql -h YOUR_REMOTE_DB_HOST -p 5432 -U YOUR_DB_USER -d kidchatbox

# If connection succeeds, you'll see the PostgreSQL prompt
# Type \q to exit
```

**If connection fails, check:**
1. Remote PostgreSQL server allows connections from your Hostinger server IP
2. Firewall on remote server allows port 5432
3. Database credentials are correct
4. Database `kidchatbox` exists on remote server

### Setup Database Tables

```bash
# This will create all required tables in your remote database
npm run db:setup
```

**Note:** Ensure the database user has CREATE TABLE permissions on the remote PostgreSQL server.

## 🚀 Step 3: Start Application with PM2

```bash
# Start application
npm run start:pm2

# Check status
pm2 status

# View logs
npm run logs:pm2

# Save PM2 configuration (auto-start on reboot)
pm2 save
pm2 startup
# Follow the instructions shown
```

## 🌐 Step 4: Configure Nginx Reverse Proxy

### Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/kidchatbox
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS (after SSL setup)
    # return 301 https://$server_name$request_uri;

    # For now, proxy to Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/kidchatbox /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## 🔒 Step 5: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal test
sudo certbot renew --dry-run
```

After SSL setup, update Nginx config to redirect HTTP to HTTPS (uncomment the redirect line).

## 🔥 Step 6: Configure Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## 📝 Step 7: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your OAuth 2.0 Client
3. Add authorized origins:
   - `https://yourdomain.com`
4. Add authorized redirect URIs:
   - `https://yourdomain.com`

## ✅ Step 8: Verify Deployment

1. **Check Application Status:**
   ```bash
   pm2 status
   pm2 logs kidchatbox-api
   ```

2. **Test API Endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Test Website:**
   - Visit `https://yourdomain.com`
   - Check browser console for errors

## 🔄 Updating Application

When you need to update the application:

```bash
cd /var/www/kidchatbox

# Pull latest changes
git pull origin main

# Install ALL dependencies (including devDependencies for building)
npm install

# Rebuild frontend
npm run build

# Restart application
npm run restart:pm2

# Check logs
npm run logs:pm2

# Optional: Remove devDependencies after build to save space
# npm prune --production
```

## 🛠️ Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs kidchatbox-api --lines 100

# Check if port is in use
sudo netstat -tulpn | grep 3000

# Restart PM2
pm2 restart all
```

### Database Connection Issues

**For Remote PostgreSQL:**

```bash
# Install PostgreSQL client (if not installed)
sudo apt install -y postgresql-client

# Test remote database connection
psql -h YOUR_REMOTE_DB_HOST -p 5432 -U YOUR_DB_USER -d kidchatbox

# Check if port 5432 is accessible
telnet YOUR_REMOTE_DB_HOST 5432
# Or
nc -zv YOUR_REMOTE_DB_HOST 5432

# Test connection from Node.js
node -e "const { Pool } = require('pg'); const pool = new Pool({ host: process.env.DB_HOST, port: process.env.DB_PORT, database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD }); pool.query('SELECT NOW()').then(r => { console.log('✅ Connected:', r.rows[0]); process.exit(0); }).catch(e => { console.error('❌ Error:', e.message); process.exit(1); });"
```

**For Local PostgreSQL:**

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -U kidchatbox_user -d kidchatbox -h localhost

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

**Common Remote Database Issues:**

1. **Connection timeout:** Check firewall rules on remote PostgreSQL server
2. **Authentication failed:** Verify username/password in `.env` file
3. **Host not found:** Verify `DB_HOST` is correct (IP or domain name)
4. **Port blocked:** Ensure port 5432 is open on remote server firewall

### Nginx Issues

```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Permission Issues

```bash
# Fix file permissions
sudo chown -R $USER:$USER /var/www/kidchatbox
chmod -R 755 /var/www/kidchatbox
```

## 📊 Monitoring

### PM2 Monitoring

```bash
# Monitor in real-time
pm2 monit

# View detailed info
pm2 show kidchatbox-api
```

### System Resources

```bash
# Check CPU and memory
htop
# Or
top
```

## 🔐 Security Checklist

- [ ] Strong database password set
- [ ] JWT_SECRET is random and secure (32+ characters)
- [ ] Environment variables not exposed
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Regular backups configured
- [ ] PM2 auto-restart enabled
- [ ] Logs monitored regularly

## 📞 Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs kidchatbox-api`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check system logs: `journalctl -xe`
4. Verify environment variables are set correctly
5. Ensure all ports are accessible

## 🎉 Success!

Your application should now be live at `https://yourdomain.com`

