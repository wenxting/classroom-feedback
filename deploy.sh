#!/bin/bash
# 课堂反馈 - 腾讯云轻量服务器部署脚本
# 使用方法：bash deploy.sh 你的服务器IP

if [ -z "$1" ]; then
  echo "用法: bash deploy.sh 你的服务器IP"
  exit 1
fi

SERVER=$1
WEB_DIR=/var/www/classroom-feedback

echo "=== 1. 上传文件到服务器 ==="
ssh root@$SERVER "mkdir -p $WEB_DIR"
scp -r www/* root@$SERVER:$WEB_DIR/

echo "=== 2. 安装 Nginx ==="
ssh root@$SERVER "
  if command -v apt &>/dev/null; then
    apt update && apt install -y nginx
  else
    yum install -y nginx
  fi
"

echo "=== 3. 配置 Nginx ==="
ssh root@$SERVER "cat > /etc/nginx/conf.d/classroom-feedback.conf << 'NGINX'
server {
    listen 80;
    server_name _;
    root /var/www/classroom-feedback;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|svg|ico)$ {
        expires 30d;
        add_header Cache-Control \"public, immutable\";
    }
}
NGINX
"

echo "=== 4. 启动 Nginx ==="
ssh root@$SERVER "
  nginx -t && systemctl restart nginx && systemctl enable nginx
  echo '部署完成！访问 http://$SERVER'
"
