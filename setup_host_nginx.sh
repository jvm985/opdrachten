#!/bin/bash

# Controleer of we sudo-rechten hebben
if [[ $EUID -ne 0 ]]; then
   echo "Draai dit script a.u.b. met sudo: sudo bash setup_host_nginx.sh"
   exit 1
fi

echo "🔧 Configureren van Host Nginx voor Docker Proxy (Poort 8090)..."

# 1. Docent Portaal Config
cat <<EOF > /etc/nginx/sites-available/docent.irishof.cloud.conf
server {
    listen 80;
    server_name docent.irishof.cloud;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# 2. Student Portaal Config
cat <<EOF > /etc/nginx/sites-available/student.irishof.cloud.conf
server {
    listen 80;
    server_name student.irishof.cloud;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:8090;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

# 3. Links aanmaken naar sites-enabled
ln -sf /etc/nginx/sites-available/docent.irishof.cloud.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/student.irishof.cloud.conf /etc/nginx/sites-enabled/

# 4. Nginx testen en herstarten
echo "🧪 Testen van Nginx configuratie..."
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuratie is OK. Herstarten..."
    systemctl reload nginx
    echo "🚀 Host Nginx is nu correct gekoppeld aan Docker poort 8090 met 50MB limiet!"
else
    echo "❌ Fout in Nginx configuratie. Controleer de output hierboven."
    exit 1
fi
