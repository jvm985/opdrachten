FROM node:22-alpine

WORKDIR /app

# Installeer build dependencies voor sqlite3 en tools voor studenten import
RUN apk add --no-cache python3 make g++ poppler-utils imagemagick

COPY package*.json ./
RUN npm install

COPY . .
RUN mkdir -p data public/photos && chmod -R 777 data public/photos
RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
