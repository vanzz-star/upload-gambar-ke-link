import Busboy from "busboy";
import FormData from "form-data";

export const config = {
  api: {
    bodyParser: false, // WAJIB
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const busboy = Busboy({ headers: req.headers });

  let uploadPromise = new Promise((resolve, reject) => {
    let fileData = [];
    let filename = "";

    busboy.on("file", (fieldname, file, info) => {
      filename = info.filename;
      file.on("data", (data) => {
        fileData.push(data);
      });
      file.on("end", () => {});
    });

    busboy.on("finish", async () => {
      try {
        const buffer = Buffer.concat(fileData);

        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", buffer, filename);

        const uploadRes = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: formData,
          headers: formData.getHeaders(),
        });

        const link = await uploadRes.text();
        resolve(link.trim());
      } catch (err) {
        reject(err);
      }
    });

    req.pipe(busboy);
  });

  try {
    const link = await uploadPromise;
    res.status(200).json({ link });
  } catch (err) {
    res.status(500).json({ error: "Upload gagal", detail: err.message });
  }
}
