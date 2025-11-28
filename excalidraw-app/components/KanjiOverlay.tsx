/* eslint-disable no-console */
import React, { useState } from "react";
import { Island } from "@excalidraw/excalidraw/components/Island";
import { CloseIcon } from "@excalidraw/excalidraw/components/icons";
import "./KanjiOverlay.scss";

interface KanjiOverlayProps {
    onClose: () => void;
}

interface KanjiCardData {
    id: number;
    number: string;
    word: string;
    kanji: string;
    key: string[];
    description: React.ReactNode;
    footer: React.ReactNode;
}

const KANJI_DATA: KanjiCardData[] = [
    {
        id: 1,
        number: "1",
        word: "one",
        kanji: "一",
        key: ["floor", "ceiling", "one"],
        description: (
            <>
                In Chinese characters, the number <strong>one</strong> is laid on its
                side, unlike the Roman numeral I which stands upright. As you would
                expect, it is written from left to right. [1]
            </>
        ),
        footer: (
            <>
                * As a primitive element, the key-word meaning is discarded, and the
                single horizontal stroke takes on the meaning of <em>floor</em> or{" "}
                <em>ceiling</em>, depending on its position: if it stands above another
                primitive, it means <em>ceiling</em>; if below, <em>floor</em>.
            </>
        ),
    },
    {
        id: 8,
        number: "8",
        word: "eight",
        kanji: "八",
        key: ["eight"],
        description: (
            <>
                Just as the Arabic numeral "8" is composed of a small circle followed by
                a larger one, so the kanji for <strong>eight</strong> is composed of a
                short line followed by a longer line, slanting towards it but not
                touching it. And just as the "lazy 8" ∞ is the mathematical symbol for
                "infinity," so the expanse opened up below these two strokes is
                associated by the Japanese with the sense of an{" "}
                <em>infinite expanse</em> or something "all-encompassing." [2]
            </>
        ),
        footer: (
            <div style={{ display: "flex", gap: "20px", fontSize: "1.5rem" }}>
                <span>丿</span>
                <span>八</span>
            </div>
        ),
    },
];

export const KanjiOverlay: React.FC<KanjiOverlayProps> = ({ onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [size, setSize] = useState({ width: 600, height: 400 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % KANJI_DATA.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) =>
            prev === 0 ? KANJI_DATA.length - 1 : prev - 1,
        );
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isResizing) return;
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height,
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y,
            });
        } else if (isResizing) {
            const dx = e.clientX - resizeStart.x;
            const dy = e.clientY - resizeStart.y;
            setSize({
                width: Math.max(300, resizeStart.width + dx),
                height: Math.max(200, resizeStart.height + dy),
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    const currentCard = KANJI_DATA[currentIndex];

    return (
        <div
            className="KanjiOverlay"
            style={{
                top: position.y,
                left: position.x,
                width: size.width,
                height: size.height,
                transform: "translate(-50%, -50%)",
                cursor: isDragging ? "grabbing" : "default",
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div style={{ width: "100%", height: "100%" }} onMouseDown={handleMouseDown}>
                <Island padding={4} className="KanjiOverlay__island" style={{ width: "100%", height: "100%" }}>
                    <button
                        className="KanjiOverlay__close"
                        onClick={onClose}
                        title="Close"
                        aria-label="Close"
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {CloseIcon}
                    </button>

                    <div className="KanjiOverlay__navigation">
                        <button
                            className="KanjiOverlay__nav-button"
                            onClick={handlePrev}
                            aria-label="Previous card"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            ←
                        </button>
                        <button
                            className="KanjiOverlay__nav-button"
                            onClick={handleNext}
                            aria-label="Next card"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            →
                        </button>
                    </div>

                    <div className="KanjiOverlay__header">
                        <div className="KanjiOverlay__number">{currentCard.number}</div>
                        <div className="KanjiOverlay__word">{currentCard.word}</div>
                    </div>

                    <div className="KanjiOverlay__body">
                        <div className="KanjiOverlay__kanji">{currentCard.kanji}</div>
                        <div className="KanjiOverlay__description">{currentCard.description}</div>
                    </div>

                    <div className="KanjiOverlay__footer">{currentCard.footer}</div>
                    <div
                        className="KanjiOverlay__resize-handle"
                        onMouseDown={handleResizeMouseDown}
                    />
                </Island>
            </div>
        </div>
    );
};
