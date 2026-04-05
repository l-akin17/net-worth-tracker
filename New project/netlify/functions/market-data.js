const { getMarketData } = require("../../market-data-service");

exports.handler = async function handler(event) {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const data = await getMarketData(payload, process.env);
    return jsonResponse(200, data);
  } catch (error) {
    return jsonResponse(500, {
      error: "Market data refresh failed",
      details: error.message,
    });
  }
};

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
