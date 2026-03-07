# ⚡ Quick Deployment Reference

## 🎯 Quick Steps

1. **SSH into Hostinger server**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install dependencies** (one-time setup)
   ```bash
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs nginx git postgresql-client
   sudo npm install -g pm2
   ```
   **Note:** PostgreSQL client is only for testing. You're using a remote PostgreSQL server.

3. **Setup remote database connection**
   - Configure your remote PostgreSQL server to allow connections from Hostinger IP
   - Test connection: `psql -h YOUR_REMOTE_DB_HOST -U YOUR_DB_USER -d kidchatbox`
   - Ensure database `kidchatbox` exists on remote server

4. **Deploy application**
   ```bash
   cd /var/www
   git clone https://github.com/CODERAI006/kid-chatbox.git kidchatbox
   cd kidchatbox
   npm install  # Install ALL dependencies (needed for build)
   npm run build  # Build frontend (requires TypeScript & Vite)
   ```

5. **Configure environment**
   ```bash
   cp env.production.template .env
   nano .env  # Edit with your REMOTE database credentials
   # Set DB_HOST to your remote PostgreSQL server IP/domain
   # Set DB_USER, DB_PASSWORD, DB_NAME for remote database
   npm run db:setup  # Creates tables on remote database
   ```

6. **Start with PM2**
   ```bash
   npm run start:pm2
   pm2 save
   pm2 startup  # Follow instructions
   ```

7. **Configure Nginx** (see HOSTINGER_DEPLOYMENT.md for full config)

8. **Setup SSL**
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## 📝 Important Commands

```bash
# View logs
pm2 logs kidchatbox-api

# Restart app
pm2 restart kidchatbox-api

# Update application
git pull && npm install && npm run build && pm2 restart kidchatbox-api

# Check status
pm2 status
```

## 🔗 Files Created

- `HOSTINGER_DEPLOYMENT.md` - Complete deployment guide
- `ecosystem.config.js` - PM2 configuration
- `deploy.sh` - Automated deployment script
- `env.production.template` - Production environment template

