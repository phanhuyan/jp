import { useState, useEffect } from 'react';

export interface KanjiEntry {
    kanji: string;
    id_5th_ed: number;
    id_6th_ed: number;
    keyword_5th_ed: string;
    keyword_6th_ed: string;
    components: string[];
    on_reading: string[];
    kun_reading: string[];
    stroke_count: number;
    jlpt: string;
}

const CSV_PATH = '/heisig-kanjis.csv';

export function useKanjiData() {
    const [kanjiData, setKanjiData] = useState<KanjiEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadCSV = async () => {
            try {
                const response = await fetch(CSV_PATH);
                if (!response.ok) {
                    throw new Error(`Failed to load CSV: ${response.status}`);
                }
                const text = await response.text();
                const lines = text.trim().split('\n');

                // Skip header row
                const dataLines = lines.slice(1);

                const entries: KanjiEntry[] = dataLines.map(line => {
                    // Parse CSV properly handling commas in quotes
                    const values = parseCSVLine(line);

                    return {
                        kanji: values[0] || '',
                        id_5th_ed: parseInt(values[1]) || 0,
                        id_6th_ed: parseInt(values[2]) || 0,
                        keyword_5th_ed: values[3] || '',
                        keyword_6th_ed: values[4] || '',
                        components: values[5] ? values[5].split('; ').filter(Boolean) : [],
                        on_reading: values[6] ? values[6].split('; ').filter(Boolean) : [],
                        kun_reading: values[7] ? values[7].split('; ').filter(Boolean) : [],
                        stroke_count: parseInt(values[8]) || 0,
                        jlpt: values[9] || '',
                    };
                }).filter(entry => entry.kanji); // Filter out empty entries

                setKanjiData(entries);
                setIsLoading(false);
            } catch (e: any) {
                console.error('Failed to load kanji data:', e);
                setError(e.message);
                setIsLoading(false);
            }
        };

        loadCSV();
    }, []);

    return { kanjiData, isLoading, error };
}

// Parse a CSV line handling quoted values with commas
function parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return values;
}

// Helper to get kanji by index (1-based Heisig number)
export function getKanjiByHeisigNumber(data: KanjiEntry[], number: number): KanjiEntry | undefined {
    return data.find(k => k.id_6th_ed === number);
}

// Helper to search kanji by keyword
export function searchKanjiByKeyword(data: KanjiEntry[], keyword: string): KanjiEntry[] {
    const lower = keyword.toLowerCase();
    return data.filter(k =>
        k.keyword_6th_ed.toLowerCase().includes(lower) ||
        k.keyword_5th_ed.toLowerCase().includes(lower) ||
        k.components.some(c => c.toLowerCase().includes(lower))
    );
}
