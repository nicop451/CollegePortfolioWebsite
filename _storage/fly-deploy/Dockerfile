FROM nginx:alpine

# Remove default nginx placeholder
RUN rm -rf /usr/share/nginx/html/*

# Copy all site files
COPY . /usr/share/nginx/html/

# Drop our nginx config in place
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
