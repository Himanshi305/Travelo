import pool from '../config/db.js';

export const getDestinations = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Destination_Master');
    res.json(rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const getDestination = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM Destination_Master WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const createDestination = async (req, res) => {
  const { name, description, image_url, rating, lat, lng } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO Destination_Master (name, description, image_url, rating, lat, lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, image_url, rating, lat, lng]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const updateDestination = async (req, res) => {
  const { name, description, image_url, rating, lat, lng } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE Destination_Master SET name = $1, description = $2, image_url = $3, rating = $4, lat = $5, lng = $6 WHERE id = $7 RETURNING *',
      [name, description, image_url, rating, lat, lng, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

export const deleteDestination = async (req, res) => {
  try {
    const { rows } = await pool.query('DELETE FROM Destination_Master WHERE id = $1 RETURNING *', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ msg: 'Destination not found' });
    }
    res.json({ msg: 'Destination deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
