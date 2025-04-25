FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
# Installing nodemon on the container to not pollute host
RUN npm install -g nodemon
EXPOSE 4000
EXPOSE 9229
# We need to run legacy watch mode for it to work on the container via polling for Windows host
CMD ["nodemon",  "-L", "--watch dist", "--inspect=0.0.0.0", "dist/server.js"]