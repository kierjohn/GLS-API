cd /root/gls_be

echo "pulling latest commit from the repo"
git reset --hard && git pull

echo "build should started start in a moments"
yarn install && yarn tsc

pm2 restart 0
systemctl restart nginx

