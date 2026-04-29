import axios from "axios";

const BASE = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

const api = axios.create({ baseURL: BASE, timeout: 15000 });
export const get  = (url, p) => api.get(url, { params: p }).then(r => r.data);
export const post = (url, d) => api.post(url, d).then(r => r.data);
export default api;