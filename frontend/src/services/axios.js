import axios from "axios";
import supabase from "../lib/supabase";

const rawBackendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

const normalizedBackendUrl = rawBackendUrl
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const api = axios.create({
  baseURL: normalizedBackendUrl,
});

api.interceptors.request.use(async (config) => {
  if (config.data instanceof FormData) {
    delete config.headers?.["Content-Type"];
    delete config.headers?.common?.["Content-Type"];
  } else if (!config.headers?.["Content-Type"]) {
    config.headers = {
      ...config.headers,
      "Content-Type": "application/json",
    };
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
});

export default api;