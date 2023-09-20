import { IncomingMessage, ServerResponse } from "http";
import httpProxy from "http-proxy";

const API_URL = process.env.API_URL; // The actual URL of your API
const proxy = httpProxy.createProxyServer();

// Make sure that we don't parse JSON bodies on this route:
export const config = {
  api: {
    bodyParser: false
  }
};

export default (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => {
  return new Promise<void>((resolve, reject) => {
    proxy.web(req, res, { target: API_URL, changeOrigin: true }, err => {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
};
