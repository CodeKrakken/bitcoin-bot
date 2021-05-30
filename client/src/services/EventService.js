import axios from "axios"

export default {
  async getTick() {
    let res = await axios.get("http://localhost:8000/tick");
    return res.data;
  }
}
