import supabase from '../config/supabase.js';

export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

    // 🔍 log Supabase response
    console.log("Supabase user:", data);
    console.log("Supabase error:", error);

    if (error || !data?.user) {
      return res.status(401).json({ msg: 'Invalid token' });
    }

    req.user = data.user;

    next();

  } catch (err) {
    console.error("Auth middleware crash:", err);
    return res.status(401).json({ msg: 'Token verification failed' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Admin access required' });
  }
};

export const isVendor = (req, res, next) => {
  if (req.user && req.user.role === 'vendor') {
    next();
  } else {
    res.status(403).json({ msg: 'Vendor access required' });
  }
};