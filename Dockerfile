# ==================================================
# Dockerfile cho Pokemon PHP App
# ==================================================
# FROM = base image (giống chọn iOS Deployment Target)
# php:8.1-apache = image có sẵn PHP 8.1 + Apache web server
# Không cần install PHP/Apache manually nữa!
FROM php:8.1-apache

# RUN = chạy command trong quá trình BUILD (không phải runtime)
# Giống "Build Phase → Run Script" trong Xcode
# Install PHP extensions cần cho MySQL connection
RUN docker-php-ext-install mysqli pdo pdo_mysql

# Enable Apache mod_rewrite (cho URL routing /api/sessions.php)
RUN a2enmod rewrite

# COPY = copy files từ máy bạn vào trong image
# Giống "Copy Bundle Resources" trong Xcode
# Copy toàn bộ source code vào /var/www/html/ (Apache document root)
COPY . /var/www/html/

# Set permissions (Apache chạy với user www-data)
RUN chown -R www-data:www-data /var/www/html/

# EXPOSE = declare port container listen (documentation purpose)
# Giống Info.plist URLSchemes — declare, không enforce
EXPOSE 80
