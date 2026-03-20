import type { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user as Express.User | undefined;
  const allowedRoles = new Set(["admin", "owner", "manager", "staff"]);
  if (!user || !allowedRoles.has(user.role)) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  next();
}

