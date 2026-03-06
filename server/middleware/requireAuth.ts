import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res
      .status(401)
      .json({ success: false, error: "Not authenticated" });
  }
  next();
}

