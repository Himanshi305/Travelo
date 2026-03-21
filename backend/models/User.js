import supabase from "../config/supabase.js";

const User = {

  create: async (name, email, password, role) => {
    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password, role }]);

    if (error) throw error;
    return data;
  },

  findByEmail: async (email) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) throw error;
    return data;
  },

  findById: async (id) => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

};

export default User;