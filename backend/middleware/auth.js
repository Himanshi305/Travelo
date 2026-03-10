import jwt from "jsonwebtoken";

export const auth = (req, res, next) => {
  console.log("Headers:", req.headers);

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("No Authorization header");
    return res.status(401).send("Access denied. No token provided.");
  }

  const token = authHeader.split(" ")[1];
  console.log("Token received:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.log("JWT error:", err.message);
    return res.status(401).send("Invalid token");
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).send('Forbidden');
  }
  next();
};

export const isVendor = (req, res, next) => {
    if (req.user.role !== 'vendor') {
      return res.status(403).send('Forbidden');
    }
    next();
  };
