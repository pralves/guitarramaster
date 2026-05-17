FROM node:22-alpine AS app

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4174

COPY package.json package-lock.json ./
COPY assets ./assets
COPY js ./js
COPY scripts ./scripts
COPY index.html landing.html design-system.html robots.txt db.json ./

RUN npm run build

EXPOSE 4174

CMD ["npm", "run", "start"]
