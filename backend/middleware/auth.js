import jwt from 'jsonwebtoken';

export const auth = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).send('Access denied');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send('Invalid token');
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
