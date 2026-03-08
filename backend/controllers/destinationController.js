import pool from '../config/db.js';

// GET all destinations
export const getDestinations = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM Destination_Master');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// GET single destination
export const getDestination = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM Destination_Master WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// CREATE destination
export const createDestination = async (req, res) => {
  const { name, description, image_url, rating, lat, lng } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO Destination_Master (name, description, image_url, rating, lat, lng) VALUES (?, ?, ?, ?, ?, ?)',
      [name, description, image_url, rating, lat, lng]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      description,
      image_url,
      rating,
      lat,
      lng
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// UPDATE destination
export const updateDestination = async (req, res) => {
  const { name, description, image_url, rating, lat, lng } = req.body;

  try {
    const [result] = await pool.query(
      'UPDATE Destination_Master SET name=?, description=?, image_url=?, rating=?, lat=?, lng=? WHERE id=?',
      [name, description, image_url, rating, lat, lng, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }

    res.json({ msg: 'Destination updated' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

// DELETE destination
export const deleteDestination = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM Destination_Master WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }

    res.json({ msg: 'Destination deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};