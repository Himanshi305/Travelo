import supabase from "../config/supabase.js";

// GET all destinations
export const getDestinations = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .select("*");

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// GET single destination
export const getDestination = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ msg: "Destination not found" });
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// CREATE destination
export const createDestination = async (req, res) => {
  const { destination_name } = req.body;

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .insert([{ destination_name }])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// UPDATE destination
export const updateDestination = async (req, res) => {
  const { destination_name } = req.body;

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .update({
        destination_name,
      })
      .eq("id", req.params.id)
      .select();

    if (error || data.length === 0) {
      return res.status(404).json({ msg: "Destination not found" });
    }

    res.json({ msg: "Destination updated" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// DELETE destination
export const deleteDestination = async (req, res) => {
  try {
    const { error } = await supabase
      .from("Destination_Master")
      .delete()
      .eq("id", req.params.id);

    if (error) throw error;

    res.json({ msg: "Destination deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};