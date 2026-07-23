FROM node:18-bullseye
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build
CMD ["npm", "run", "dev"]
