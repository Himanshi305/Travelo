import supabase from '../config/supabase.js';

export const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await supabase.auth.getUser(token);

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
  if (req.user && req.user.user_metadata?.role === 'admin') {
    next();
  } else {
    res.status(403).json({ msg: 'Admin access required' });
  }
};