FROM node:22-alpine AS app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4174
ENV DB_PATH=/app/data/db.json

COPY package.json package-lock.json ./
COPY assets ./assets
COPY js ./js
COPY scripts ./scripts
COPY index.html landing.html design-system.html login.html admin-login.html admin-dashboard.html student-dashboard.html enrollments.html robots.txt db.json ./

RUN npm run build
RUN mkdir -p /app/data

EXPOSE 4174

CMD ["npm", "run", "start"]
