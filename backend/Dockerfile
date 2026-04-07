FROM node:18

WORKDIR /app

# copiar dependencies backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install

# copiar todo el proyecto
WORKDIR /app
COPY . .

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "server.js"]