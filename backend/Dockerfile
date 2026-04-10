FROM node:22

WORKDIR /app

# dependencias
COPY backend/package*.json ./
RUN npm install

# código
COPY backend ./backend
COPY frontend ./frontend

EXPOSE 3000

CMD ["node", "backend/server.js"]