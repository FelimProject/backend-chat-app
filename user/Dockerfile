FROM alpine:3.21

RUN apk add --no-cache nodejs npm

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/dist \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["npm", "start"]