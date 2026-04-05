const { getMarketData } = require("../../market-data-service");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const payload = parseBody(event.body, event.isBase64Encoded);
    const data = await getMarketData(payload, process.env);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify({
        error: "Market data refresh failed",
        details: error.message,
      }),
    };
  }
};

function parseBody(body, isBase64Encoded) {
  if (!body) {
    return {};
  }

  let raw = body;
  if (isBase64Encoded) {
    raw = Buffer.from(body, "base64").toString("utf8");
  }

  if (typeof raw === "string") {
    return JSON.parse(raw || "{}");
  }

  return raw;
}
