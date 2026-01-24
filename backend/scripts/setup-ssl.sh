#!/bin/bash
# ============================================
# Margaz Backend - SSL Setup Script
# Lightsail Ubuntu/Bitnami için
# ============================================

# Renk kodları
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Margaz SSL Kurulum Scripti ===${NC}"
echo ""

# Domain adını sor
read -p "Domain adınızı girin (örn: api.margaz.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Hata: Domain adı gerekli!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Bu script şunları yapacak:${NC}"
echo "1. Certbot kurulumu"
echo "2. Let's Encrypt SSL sertifikası alma"
echo "3. Nginx reverse proxy kurulumu"
echo "4. Otomatik sertifika yenileme"
echo ""
read -p "Devam etmek istiyor musunuz? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "İptal edildi."
    exit 0
fi

echo ""
echo -e "${GREEN}[1/5] Sistem güncelleniyor...${NC}"
sudo apt update && sudo apt upgrade -y

echo ""
echo -e "${GREEN}[2/5] Nginx ve Certbot kuruluyor...${NC}"
sudo apt install -y nginx certbot python3-certbot-nginx

echo ""
echo -e "${GREEN}[3/5] Nginx yapılandırılıyor...${NC}"

# Nginx config oluştur
sudo tee /etc/nginx/sites-available/margaz-api > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Symlink oluştur ve varsayılanı kaldır
sudo ln -sf /etc/nginx/sites-available/margaz-api /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Nginx'i test et ve yeniden başlat
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo -e "${GREEN}[4/5] SSL sertifikası alınıyor...${NC}"
echo -e "${YELLOW}Not: DNS kayıtlarınızın $DOMAIN için bu sunucuya yönlendirilmiş olması gerekir!${NC}"
echo ""

sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

echo ""
echo -e "${GREEN}[5/5] Otomatik yenileme ayarlanıyor...${NC}"
# Certbot zaten cron job ekler, kontrol edelim
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

echo ""
echo -e "${GREEN}=== Kurulum Tamamlandı! ===${NC}"
echo ""
echo -e "API URL'iniz: ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "${YELLOW}Sonraki adımlar:${NC}"
echo "1. Netlify'da BACKEND_URL environment variable'ı ayarlayın:"
echo "   BACKEND_URL=https://$DOMAIN"
echo ""
echo "2. Backend .env dosyasını güncelleyin:"
echo "   CORS_ORIGINS=https://margaz.netlify.app"
echo ""
echo "3. PM2'yi yeniden başlatın:"
echo "   pm2 restart margaz-proxy"
echo ""
