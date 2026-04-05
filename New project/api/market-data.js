const { getMarketData } = require("../market-data-service");

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Cache-Control", "no-store");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = parseBody(request.body);
    const data = await getMarketData(payload, process.env);
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(data);
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    return response.status(500).json({
      error: "Market data refresh failed",
      details: error.message,
    });
  }
};

function parseBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    return JSON.parse(body || "{}");
  }

  return body;
}
