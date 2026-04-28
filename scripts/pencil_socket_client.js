#!/usr/bin/env node

const fs = require("fs");
const net = require("net");
const path = require("path");

const DEFAULT_SOCKET_PATH = path.join(
  process.env.HOME || "",
  ".pencil",
  "socket",
  "pencil-desktop.sock",
);
const DELIMITER = "\f";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    socketPath: DEFAULT_SOCKET_PATH,
    requestsFile: "",
    requestsJson: "",
    timeoutMs: 15000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--socket") {
      args.socketPath = argv[i + 1];
      i += 1;
    } else if (arg === "--requests") {
      args.requestsFile = argv[i + 1];
      i += 1;
    } else if (arg === "--requests-json") {
      args.requestsJson = argv[i + 1];
      i += 1;
    } else if (arg === "--timeout") {
      args.timeoutMs = Number(argv[i + 1]);
      i += 1;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  if (!args.requestsFile && !args.requestsJson) {
    fail(
      "Usage: node scripts/pencil_socket_client.js --requests /path/to/requests.json | --requests-json '[...]'",
    );
  }

  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0) {
    fail("Timeout must be a positive number");
  }

  return args;
}

function loadRequests(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return normalizeRequests(JSON.parse(raw));
}

function normalizeRequests(parsed) {
  if (!Array.isArray(parsed) || parsed.length === 0) {
    fail("Requests must be a non-empty JSON array");
  }

  return parsed.map((request, index) => {
    if (!request || typeof request !== "object") {
      fail(`Request at index ${index} must be an object`);
    }
    if (typeof request.name !== "string" || !request.name) {
      fail(`Request at index ${index} is missing a valid "name"`);
    }
    return {
      request_id: request.request_id || `req-${index + 1}`,
      name: request.name,
      payload: request.payload || {},
    };
  });
}

function loadRequestsFromJson(raw) {
  return normalizeRequests(JSON.parse(raw));
}

async function main() {
  const { socketPath, requestsFile, requestsJson, timeoutMs } = parseArgs(process.argv.slice(2));
  const requests = requestsJson ? loadRequestsFromJson(requestsJson) : loadRequests(requestsFile);
  const responses = [];

  await new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    let buffer = "";
    let clientId = "";
    let activeRequestIndex = -1;
    let timeout = null;

    function clearActiveTimeout() {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    }

    function armTimeout(label) {
      clearActiveTimeout();
      timeout = setTimeout(() => {
        reject(new Error(`Timed out while waiting for ${label}`));
        socket.destroy();
      }, timeoutMs);
    }

    function sendNextRequest() {
      activeRequestIndex += 1;
      if (activeRequestIndex >= requests.length) {
        clearActiveTimeout();
        socket.end();
        return;
      }

      const request = requests[activeRequestIndex];
      const envelope = {
        type: "tool_request",
        data: {
          request_id: request.request_id,
          client_id: clientId,
          name: request.name,
          payload: request.payload,
        },
      };
      socket.write(JSON.stringify(envelope) + DELIMITER);
      armTimeout(request.request_id);
    }

    function handleMessage(message) {
      if (!message || typeof message !== "object") {
        return;
      }

      if (message.type !== "tool_response" || !message.data) {
        return;
      }

      if (message.data.request_id === "client-id-assignment") {
        if (!message.data.success || !message.data.client_id) {
          reject(new Error("Failed to obtain Pencil client_id"));
          socket.destroy();
          return;
        }
        clientId = message.data.client_id;
        sendNextRequest();
        return;
      }

      const currentRequest = requests[activeRequestIndex];
      if (!currentRequest || message.data.request_id !== currentRequest.request_id) {
        return;
      }

      clearActiveTimeout();
      responses.push({
        request_id: message.data.request_id,
        success: Boolean(message.data.success),
        name: currentRequest.name,
        payload: message.data.payload,
        error: message.data.error || null,
        raw: message.data,
      });

      if (!message.data.success) {
        reject(
          new Error(
            `Pencil request failed: ${currentRequest.name} (${currentRequest.request_id})`,
          ),
        );
        socket.destroy();
        return;
      }

      sendNextRequest();
    }

    socket.on("connect", () => {
      armTimeout("client-id-assignment");
    });

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      const parts = buffer.split(DELIMITER);
      buffer = parts.pop() || "";
      for (const part of parts) {
        if (!part.trim()) {
          continue;
        }
        handleMessage(JSON.parse(part));
      }
    });

    socket.on("error", (error) => {
      clearActiveTimeout();
      reject(error);
    });

    socket.on("close", () => {
      clearActiveTimeout();
      resolve();
    });
  });

  process.stdout.write(JSON.stringify(responses, null, 2));
}

main().catch((error) => {
  fail(error.stack || error.message);
});
