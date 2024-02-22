const ApiCall = require("./config")

const getMe = async ({ token }) => {
  return await ApiCall("auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

module.exports = {
  getMe
}
