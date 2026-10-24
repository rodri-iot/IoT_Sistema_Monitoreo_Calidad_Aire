FROM node:18

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Exponer el puerto (5173 para dev, 4173 para preview)
EXPOSE 5173

# Por defecto ejecuta en modo desarrollo
# Para producción: npm run build && npm run preview
CMD ["npm", "run", "dev"]
