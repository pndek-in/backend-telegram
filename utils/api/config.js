const API_SERVER = process.env.API_SERVER || "http://localhost:8080"

const ApiCall = async (endPoint, options, server = API_SERVER) => {
  try {
    const fullUrl = new URL(endPoint, server).toString()
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json"
      }
    })

    const data = await response.json()

    return {
      status: response.status,
      data
    }
  } catch (error) {
    return {
      status: 500,
      data: {
        message: error.message
      }
    }
  }
}

module.exports = ApiCall
