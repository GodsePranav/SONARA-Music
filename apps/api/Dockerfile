FROM node:22-alpine
WORKDIR /workspace
COPY package.json ./
COPY apps ./apps
COPY packages ./packages
COPY tsconfig.base.json eslint.config.js ./
RUN npm install
EXPOSE 4000
CMD ["sh", "-c", "npm run build -w @sonara/contracts && npm run dev -w @sonara/api"]
