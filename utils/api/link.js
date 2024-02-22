const ApiCall = require("./config")

const createShortLink = async ({ token, payload }) => {
  return await ApiCall("/link/bot/create?source=telegram", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
}

const listShortLinks = async ({ token }) => {
  return await ApiCall("/link/bot/lists?source=telegram", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
}

const editShortLink = async ({ token, payload, id }) => {
  return await ApiCall(`/link/bot/edit/${id}?source=telegram`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  })
}

module.exports = {
  createShortLink,
  listShortLinks,
  editShortLink
}
