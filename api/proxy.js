const axios = require('axios');

module.exports = async (req, res) => {
    // Mengizinkan permintaan dari domain manapun (penting untuk Vercel preview URLs)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Menangani permintaan pre-flight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const {
        targetUrl,
        method = 'GET',
        headers = {},
        body = null,
        responseType = 'json'
    } = req.body;

    if (!targetUrl) {
        return res.status(400).json({ error: 'targetUrl is required' });
    }

    try {
        const response = await axios({
            method,
            url: targetUrl,
            headers: {
                ...headers,
                // Hapus header host asli untuk menghindari konflik
                'Host': new URL(targetUrl).host 
            },
            data: body,
            // Penting untuk menangani gambar dan file
            responseType: responseType === 'arraybuffer' ? 'arraybuffer' : 'text'
        });
        
        // Mengirim kembali header dari respons asli
        for (const [key, value] of Object.entries(response.headers)) {
            // Beberapa header tidak boleh disalin
            if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
                 res.setHeader(key, value);
            }
        }
        
        // Mengirim kembali data. Jika arraybuffer, ubah ke Base64 agar aman di JSON
        if (responseType === 'arraybuffer') {
            const data = Buffer.from(response.data, 'binary').toString('base64');
            res.status(response.status).json({ base64Data: data });
        } else {
             // Coba parse sebagai JSON, jika gagal, kirim sebagai teks biasa
            try {
                res.status(response.status).json(JSON.parse(response.data));
            } catch (e) {
                res.status(response.status).send(response.data);
            }
        }

    } catch (error) {
        console.error('Proxy Error:', error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: 'An internal server error occurred in the proxy.' };
        res.status(status).json(data);
    }
};
