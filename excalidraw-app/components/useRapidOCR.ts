import { useState, useEffect, useCallback } from 'react';
import * as ort from 'onnxruntime-web';

// Configuration
const MODEL_URL = 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.4.0/onnx/PP-OCRv5/rec/ch_PP-OCRv5_rec_mobile_infer.onnx';
const DICT_URL = 'https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.4.0/paddle/PP-OCRv5/rec/ch_PP-OCRv5_rec_mobile_infer/ppocrv5_dict.txt';

export const useRapidOCR = () => {
    const [session, setSession] = useState<ort.InferenceSession | null>(null);
    const [charList, setCharList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            try {
                // Load Dictionary
                const response = await fetch(DICT_URL);
                const text = await response.text();
                const lines = text.split(/\r?\n/);
                // 0: blank, 1..N: chars, N+1: space
                setCharList(['blank', ...lines, ' ']);

                // Load Model
                // Set wasm paths to CDN to avoid local serving issues
                ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.23.2/dist/";

                const sess = await ort.InferenceSession.create(MODEL_URL);
                setSession(sess);
                setIsLoading(false);
            } catch (e: any) {
                console.error("Failed to initialize RapidOCR:", e);
                setError(e.message);
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const processImage = useCallback(async (blob: Blob): Promise<string> => {
        if (!session) throw new Error("Model not loaded");

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = async () => {
                try {
                    // 1. Pre-process
                    const targetHeight = 48;
                    const maxTargetWidth = 320;

                    // Calculate resized width maintaining aspect ratio
                    let ratio = img.width / img.height;
                    let resizedWidth = Math.ceil(targetHeight * ratio);
                    if (resizedWidth > maxTargetWidth) resizedWidth = maxTargetWidth;

                    // Draw to canvas for pixel access
                    const canvas = document.createElement('canvas');
                    canvas.width = maxTargetWidth;
                    canvas.height = targetHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error("Could not get canvas context");

                    // Fill with black padding (0 in tensor)
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, maxTargetWidth, targetHeight);

                    // Draw resized image
                    ctx.drawImage(img, 0, 0, resizedWidth, targetHeight);

                    const imageData = ctx.getImageData(0, 0, maxTargetWidth, targetHeight);
                    const pixels = imageData.data;

                    // 2. Create Tensor [1, 3, 48, 320]
                    const float32Data = new Float32Array(3 * 48 * 320);
                    for (let i = 0; i < 48 * 320; i++) {
                        // Normalize: (pixel / 255 - 0.5) / 0.5
                        float32Data[i] = (pixels[i * 4] / 255.0 - 0.5) / 0.5; // R
                        float32Data[i + 48 * 320] = (pixels[i * 4 + 1] / 255.0 - 0.5) / 0.5; // G
                        float32Data[i + 2 * 48 * 320] = (pixels[i * 4 + 2] / 255.0 - 0.5) / 0.5; // B
                    }

                    const tensor = new ort.Tensor('float32', float32Data, [1, 3, 48, 320]);

                    // 3. Run Inference
                    const feeds = { [session.inputNames[0]]: tensor };
                    const results = await session.run(feeds);
                    const output = results[session.outputNames[0]];

                    // 4. Post-process (CTC Decode)
                    const text = ctcDecode(output, charList);

                    // Validate with server (async, don't block)
                    validateWithServer(blob).then(serverResult => {
                        console.group('OCR Validation');
                        console.log('%c Client Result:', 'color: #00aaff; font-weight: bold;', text);
                        console.log('%c Server Result:', 'color: #00ff00; font-weight: bold;', serverResult?.text);
                        console.log('Match:', text === serverResult?.text);
                        console.log('Full Server Response:', serverResult);
                        console.groupEnd();
                    });

                    resolve(text);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(blob);
        });
    }, [session, charList]);

    return { processImage, isLoading, error };
};

function ctcDecode(output: any, charList: string[]) {
    const dims = output.dims; // [1, sequence_length, vocab_size]
    const sequenceLength = dims[1];
    const vocabSize = dims[2];
    const data = output.data;

    let predIndices = [];

    // Argmax for each time step
    for (let t = 0; t < sequenceLength; t++) {
        let maxVal = -Infinity;
        let maxIdx = 0;

        const offset = t * vocabSize;
        for (let i = 0; i < vocabSize; i++) {
            if (data[offset + i] > maxVal) {
                maxVal = data[offset + i];
                maxIdx = i;
            }
        }
        predIndices.push(maxIdx);
    }

    // CTC Decode Logic
    let charIndices = [];
    for (let i = 0; i < predIndices.length; i++) {
        if (i > 0 && predIndices[i] === predIndices[i - 1]) continue;
        if (predIndices[i] !== 0) { // 0 is blank
            charIndices.push(predIndices[i]);
        }
    }

    // Map to characters
    return charIndices.map(idx => {
        if (idx < 0 || idx >= charList.length) return '';
        return charList[idx];
    }).join('');
}

async function validateWithServer(blob: Blob) {
    try {
        const formData = new FormData();
        formData.append('file', blob, 'validation_image.png');

        const response = await fetch('http://localhost:8000/ocr', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        return await response.json();
    } catch (e) {
        console.warn('OCR Server validation failed (is the server running?):', e);
        return null;
    }
}
