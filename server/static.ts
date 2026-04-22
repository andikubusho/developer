import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { log } from "./index";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  log(`Resolved static assets path: ${distPath}`, "static");
  
  if (!fs.existsSync(distPath)) {
    log(`ERROR: Static assets path NOT FOUND: ${distPath}`, "static");
    // Fallback to a secondary check if needed, but normally process.cwd() should be correct on Railway
  }

  // Serve static files from the dist/public directory
  app.use(express.static(distPath, {
    maxAge: "1d",
    index: false // We handle the root separately
  }));

  // Fallback handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    // DO NOT serve index.html for assets, api, or common static file types
    // If an asset wasn't found by express.static, return a real 404
    const isAsset = req.path.startsWith("/assets/") || 
                   /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot)$/i.test(req.path);
    
    if (isAsset) {
      log(`Asset not found: ${req.path}`, "static");
      return res.status(404).send("Asset not found");
    }

    if (req.path.startsWith("/api")) {
      return next();
    }
    
    // Only serve index.html for non-asset and non-api requests
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      // Ensure index.html is NEVER cached to prevent old asset hashes from being used
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      res.sendFile(indexPath);
    } else {
      log(`ERROR: index.html not found at ${indexPath}`, "static");
      next();
    }
  });
}
