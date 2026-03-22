import supabase from "../config/supabase.js";

// GET all destinations
export const getDestinations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// GET single destination
export const getDestination = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", userId)
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
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  if (!destination_name || !String(destination_name).trim()) {
    return res.status(400).json({ msg: "destination_name is required" });
  }

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .insert([{ destination_name: String(destination_name).trim(), user_id: userId }])
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
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  if (!destination_name || !String(destination_name).trim()) {
    return res.status(400).json({ msg: "destination_name is required" });
  }

  try {
    const { data, error } = await supabase
      .from("Destination_Master")
      .update({
        destination_name: String(destination_name).trim(),
      })
      .eq("id", req.params.id)
      .eq("user_id", userId)
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
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ msg: "Unauthorized" });
  }

  try {
    const { error } = await supabase
      .from("Destination_Master")
      .delete()
      .eq("id", req.params.id)
      .eq("user_id", userId);

    if (error) throw error;

    res.json({ msg: "Destination deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};