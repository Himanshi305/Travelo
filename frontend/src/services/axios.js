import axios from "axios";
import supabase from "../lib/supabase";

const api = axios.create({
  baseURL: "http://localhost:5000", // Update with your backend URL
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
});

export default api;