# PBAG Consortium — pbagco.com  (Google Cloud Run)
FROM node:22-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server ./server
COPY public ./public
USER node
EXPOSE 8080
CMD ["node", "server/index.js"]
