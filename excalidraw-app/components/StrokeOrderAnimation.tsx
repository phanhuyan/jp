import React, { useState, useEffect, useRef } from 'react';

interface StrokeOrderAnimationProps {
    kanji: string;
    size?: number;
    strokeDuration?: number; // ms per stroke
}

export const StrokeOrderAnimation: React.FC<StrokeOrderAnimationProps> = ({
    kanji,
    size = 100,
    strokeDuration = 500,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [error, setError] = useState(false);

    // Convert kanji to hex code for KanjiVG filename
    const kanjiHex = kanji.charCodeAt(0).toString(16).padStart(5, '0');
    const svgUrl = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${kanjiHex}.svg`;

    useEffect(() => {
        setError(false);
        setSvgContent(null);
        setIsPlaying(false);

        fetch(svgUrl)
            .then(res => {
                if (!res.ok) throw new Error('SVG not found');
                return res.text();
            })
            .then(svg => {
                setSvgContent(svg);
            })
            .catch(() => {
                setError(true);
            });
    }, [kanji, svgUrl]);

    useEffect(() => {
        if (!svgContent || !containerRef.current) return;

        // Parse and inject SVG
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svg = doc.querySelector('svg');

        if (!svg) return;

        // Clear container and add SVG
        containerRef.current.innerHTML = '';

        // Set SVG size
        svg.setAttribute('width', String(size));
        svg.setAttribute('height', String(size));
        svg.style.overflow = 'visible';

        // Find all stroke paths (they have stroke-order data attributes)
        const paths = svg.querySelectorAll('path[d]');

        paths.forEach((path, index) => {
            const pathEl = path as SVGPathElement;

            // Style the path for animation
            pathEl.style.fill = 'none';
            pathEl.style.stroke = '#333';
            pathEl.style.strokeWidth = '4';
            pathEl.style.strokeLinecap = 'round';
            pathEl.style.strokeLinejoin = 'round';

            // Get path length for animation
            const length = pathEl.getTotalLength();
            pathEl.style.strokeDasharray = String(length);
            pathEl.style.strokeDashoffset = String(length);

            // Set animation delay based on stroke order
            pathEl.style.animation = `drawStroke ${strokeDuration}ms ease-out forwards`;
            pathEl.style.animationDelay = `${index * strokeDuration}ms`;
        });

        // Style stroke order numbers to be more visible
        svg.querySelectorAll('text').forEach((text, index) => {
            const textEl = text as SVGTextElement;
            textEl.style.fill = '#6965db';
            textEl.style.fontSize = '8px';
            textEl.style.fontWeight = 'bold';
            textEl.style.fontFamily = 'Arial, sans-serif';
            // Animate numbers appearing with strokes
            textEl.style.opacity = '0';
            textEl.style.animation = `fadeIn 200ms ease-out forwards`;
            textEl.style.animationDelay = `${index * strokeDuration}ms`;
        });

        containerRef.current.appendChild(svg);
        setIsPlaying(true);

    }, [svgContent, size, strokeDuration]);

    const replay = () => {
        if (!containerRef.current) return;

        // Reset animation by re-triggering
        const paths = containerRef.current.querySelectorAll('path');
        paths.forEach((path, index) => {
            path.style.animation = 'none';
            void path.getBBox(); // Force reflow
            path.style.animation = `drawStroke ${strokeDuration}ms ease-out forwards`;
            path.style.animationDelay = `${index * strokeDuration}ms`;
        });
    };

    if (error) {
        return (
            <div
                className="KanjiPage__stroke-order"
                style={{ fontSize: size * 0.6, color: '#333' }}
            >
                {kanji}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="KanjiPage__stroke-order"
            onClick={replay}
            title="Click to replay animation"
        />
    );
};
