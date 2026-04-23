import axios from "axios";
const api = axios.create({ baseURL: "http://127.0.0.1:5000", timeout: 15000 });
export const get  = (url, p) => api.get(url,  { params: p }).then(r => r.data);
export const post = (url, d) => api.post(url, d).then(r => r.data);
export default api;
