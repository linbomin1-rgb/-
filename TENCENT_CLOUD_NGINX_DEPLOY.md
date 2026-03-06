# 腾讯云轻量应用服务器 (Nginx) 部署指南

本方案适用于您已经有一台**腾讯云轻量应用服务器 (Lighthouse)** 或 **云服务器 (CVM)** 的场景。

## 1. 准备工作
*   下载我为您生成的 `salon_system_dist.zip` 并解压，得到 `dist` 文件夹。
*   使用 SSH 工具（如 Xshell、Termius）登录您的腾讯云服务器。

## 2. 安装 Nginx (如果尚未安装)
```bash
# Ubuntu/Debian 系统
sudo apt update && sudo apt install nginx -y

# CentOS 系统
sudo yum install nginx -y
```

## 3. 上传构建产物
1.  将解压后的 `dist` 文件夹内容上传到服务器的 `/var/www/salon-system` 目录下。
2.  **命令示例** (在您的本地电脑执行)：
    ```bash
    scp -r ./dist/* root@您的服务器IP:/var/www/salon-system/
    ```

## 4. 配置 Nginx
1.  在服务器上创建或编辑 Nginx 配置文件：
    ```bash
    sudo nano /etc/nginx/sites-available/salon-system
    ```
2.  输入以下配置内容 (请将 `yourdomain.com` 替换为您的域名)：
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com; # 您的腾讯云域名

        root /var/www/salon-system;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存优化
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 30d;
            add_header Cache-Control "public, no-transform";
        }
    }
    ```
3.  启用配置并重启 Nginx：
    ```bash
    sudo ln -s /etc/nginx/sites-available/salon-system /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemcall restart nginx
    ```

## 5. 配置域名解析
1.  登录 [腾讯云控制台](https://console.cloud.tencent.com/)。
2.  进入 **云解析 DNS**。
3.  在您的域名下添加一条 **A 记录**，主机记录填写您想要的前缀（如 `salon`），记录值填写您的 **服务器公网 IP**。

---
**部署完成！** 您的系统现在可以通过您的自定义域名在国内公网访问了。
