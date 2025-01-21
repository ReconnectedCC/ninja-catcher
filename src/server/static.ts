import * as fs from "fs";
import type * as http from "http";
import * as path from "path";
import type { UrlWithParsedQuery } from "url";

const mimeTypes: { [key: string]: string | undefined } = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpg",
  ".lua": "text/lua",
};

export const handle = (dir: string) => (requestUrl: UrlWithParsedQuery, _request: http.IncomingMessage, response: http.ServerResponse) => {
  let filePath = path.join(dir, !requestUrl.pathname || requestUrl.pathname === "/"
    ? "index.html"
    : requestUrl.pathname);

  filePath = path.resolve(filePath);
  if (!filePath.startsWith(path.resolve(dir))) {
    response.writeHead(403, { "Content-Type": "text/html" });
    response.end("Forbidden", "utf-8");
    return;
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const mime = mimeTypes[extname];

  if (!mime) {
    fs.readFile(path.join(dir, "404.html"), { encoding: "utf-8" }, (_error, contents) => {
      response.writeHead(404, { "Content-Type": "text/html" });
      response.end(contents, "utf-8");
    });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === "ENOENT") {
        fs.readFile(path.join(dir, "404.html"), { encoding: "utf-8" }, (_error, contents) => {
          response.writeHead(404, { "Content-Type": "text/html" });
          response.end(contents || "Not Found", "utf-8");
        });
      } else {
        response.writeHead(500);
        response.end("Sorry, check with the site admin for error: " + error.code + " ..\n");
        response.end();
      }
    } else {
      response.writeHead(200, { "Content-Type": mime });
      response.end(content, "utf-8");
    }
  });
};
