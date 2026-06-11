FROM node:20-alpine

# Build tools for node-pty + git for git integration
RUN apk add --no-cache python3 make g++ bash git

# Install LSP servers (optional — IDE works without them, they just add diagnostics)
# Uncomment the ones you want:
RUN npm install -g typescript-language-server typescript 2>/dev/null || true
# RUN pip3 install python-lsp-server 2>/dev/null || true

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

VOLUME ["/workspace"]
EXPOSE 3001

CMD ["npm", "start"]
