import Busboy from "busboy";
import fetch from "node-fetch";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const busboy = Busboy({ headers: req.headers });
  let fileBuffer;
  let fileName;

  await new Promise((resolve, reject) => {
    busboy.on("file", (fieldname, file, filename) => {
      fileName = filename;
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("end", () => {
        fileBuffer = Buffer.concat(chunks);
      });
    });

    busboy.on("finish", resolve);
    busboy.on("error", reject);

    req.pipe(busboy);
  });

  try {
    const formData = new FormData();
    formData.append("reqtype", "fileupload");
    formData.append("fileToUpload", new Blob([fileBuffer]), fileName);

    const response = await fetch("https://catbox.moe/user/api.php", {
      method: "POST",
      body: formData,
    });

    const link = await response.text();
    res.status(200).json({ link: link.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
}
