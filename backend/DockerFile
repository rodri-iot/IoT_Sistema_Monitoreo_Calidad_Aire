
FROM node:18

# Crear directorio de trabajo
WORKDIR /app

# Crear directorio de certificados (se monta como volumen en tiempo de ejecución)
RUN mkdir -p ./certs

# Copiar archivos necesarios
COPY ./src ./src
COPY .env .env
COPY package*.json ./
# Nota: ./certs se monta como volumen desde docker-compose.yml
# Si quieres incluir certs en la imagen, copia desde mqtt/certs/clients/backend_smca antes del build

# Instalar dependencias
RUN npm install

# Exponer el puerto del backend
EXPOSE 3000

# Comando de inicio
CMD ["node", "src/server.js"]
