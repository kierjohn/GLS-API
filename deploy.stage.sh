cd /root/gls-be-stage

echo "pulling latest commit from the repo"
git reset --hard && git pull

echo "build should started start in a moments"
yarn install && yarn tsc

pm2 restart 3
systemctl restart nginx

