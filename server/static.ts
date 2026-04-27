import express, { type Express, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { log } from "./index";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist");
  const publicPath = path.resolve(process.cwd(), "public"); // Some deployments use public for static
  
  log(`Checking static assets at: ${distPath}`, "static");
  
  // Serve static files from the dist directory
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      maxAge: "1d",
      index: false
    }));
  }

  // Fallback handler for SPA
  app.use((req: Request, res: Response, next: NextFunction) => {
    // 1. Skip if it's an API call
    if (req.path.startsWith("/api")) {
      return next();
    }

    // 2. Skip if it looks like a static asset file
    const isAsset = /\.(js|css|png|jpg|jpeg|gif|ico|svg|json|woff|woff2|ttf|eot)$/i.test(req.path) || 
                   req.path.startsWith("/assets/");
    
    if (isAsset) {
      log(`Asset not found: ${req.path}`, "static");
      return res.status(404).send("Asset not found");
    }

    // 3. For everything else (SPA routes), serve index.html
    // Try multiple possible locations for index.html
    const possibleIndexPaths = [
      path.resolve(distPath, "index.html"),
      path.resolve(process.cwd(), "dist", "index.html"),
      path.resolve(__dirname, "..", "dist", "index.html"),
      path.resolve(__dirname, "index.html"), // Just in case it's in the same dir
    ];

    let indexPath = possibleIndexPaths.find(p => fs.existsSync(p));

    if (indexPath) {
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      return res.sendFile(indexPath);
    }

    log(`ERROR: index.html not found in any expected location: ${req.path}`, "static");
    next();
  });
}
