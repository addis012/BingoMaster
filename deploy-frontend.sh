#!/bin/bash

# Deploy frontend to production server
SERVER_IP="91.99.161.246"
USER="root"

echo "Deploying complete frontend to $SERVER_IP..."

# Create the frontend files on the server
scp -o StrictHostKeyChecking=no client/index.html $USER@$SERVER_IP:/var/www/bingo-app/client/

# Update server configuration
ssh -o StrictHostKeyChecking=no $USER@$SERVER_IP << 'ENDSSH'
cd /var/www/bingo-app

# Update server to serve frontend properly
cat > server/index.ts << 'EOF'
import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { sessionConfig } from "./session.js";
import path from "path";

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionConfig);

async function startServer() {
  try {
    const wsServer = await registerRoutes(app);
    
    const PORT = process.env.PORT || 5000;
    
    // Serve the frontend HTML file
    app.get("/", (req, res) => {
      res.sendFile(path.join(process.cwd(), "client/index.html"));
    });
    
    // Catch-all for frontend routes
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        res.status(404).json({ error: "API endpoint not found" });
      } else {
        res.sendFile(path.join(process.cwd(), "client/index.html"));
      }
    });
    
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Bingo server running on http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
EOF

# Restart the application
pm2 restart bingo-app

# Wait for restart
sleep 3

# Test the updated application
curl -s http://localhost:5000/ | head -10

echo "✅ Frontend deployed successfully"
echo "🌐 Access at: http://91.99.161.246"
ENDSSH

echo "Deployment complete!"