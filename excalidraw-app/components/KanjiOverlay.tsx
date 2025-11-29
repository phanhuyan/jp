/* eslint-disable no-console */
import React, { useState } from "react";
import { Island } from "@excalidraw/excalidraw/components/Island";
import { CloseIcon } from "@excalidraw/excalidraw/components/icons";
import { Button } from "@excalidraw/excalidraw/components/Button";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
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
    key_words: string[];
    mark?: boolean;
    story: React.ReactNode;
}

const KANJI_DATA: KanjiCardData[] = [
    {
        id: 1,
        number: "1",
        word: "one",
        kanji: "一",
        key: ["floor", "ceiling"],
        key_words: ["floor", "ceiling"],
        mark: true,
        story: (
            <>
                * As a primitive element, the key-word meaning is discarded,
                and the single horizontal stroke takes on the meaning of floor
                or ceiling, depending on its position: if it stands above another
                primitive, it means ceiling; if below, floor.
            </>
        ),
    },
    {
        id: 8,
        number: "8",
        word: "eight",
        kanji: "八",
        key: ["eight"],
        key_words: ["eight", "floor"],
        mark: true,
        story: (
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
    },
];

export const KanjiOverlay: React.FC<KanjiOverlayProps> = ({ onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 4 });
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
        if (excalidrawAPI) {
            excalidrawAPI.refresh();
        }
        setIsDragging(false);
        setIsResizing(false);
    };

    const currentCard = KANJI_DATA[currentIndex];

    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

    const clearCanvas = () => {
        if (excalidrawAPI) {
            excalidrawAPI.resetScene();
        }
    };

    const checkDrawing = () => {
        if (excalidrawAPI) {
            const elements = excalidrawAPI.getSceneElements();
            if (elements.length > 0) {
                alert(`Drawing checked! Found ${elements.length} strokes.`);
            } else {
                alert("Please draw something first!");
            }
        }
    };

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
                    <Button
                        onSelect={onClose}
                        data-testid="sidebar-close"
                        className="sidebar__close"
                        style={{ width: 24, height: 24 }}
                    >
                        {CloseIcon}
                    </Button>

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
                        <div className="KanjiOverlay__kanji">
                            {currentCard.mark && <div className="KanjiOverlay__mark">*</div>}
                            {currentCard.kanji}
                        </div>
                        <div className="KanjiOverlay__word">{currentCard.word}</div>
                    </div>

                    <div className="KanjiOverlay__keywords">
                        {currentCard.key_words.map((keyword, index) => (
                            <button
                                key={index}
                                className="KanjiOverlay__keyword-chip"
                                onClick={() => {
                                    const targetIndex = KANJI_DATA.findIndex((card) =>
                                        card.key.includes(keyword),
                                    );
                                    if (targetIndex !== -1) {
                                        setCurrentIndex(targetIndex);
                                    }
                                }}
                                type="button"
                            >
                                {keyword}
                            </button>
                        ))}
                    </div>

                    <div className="KanjiOverlay__body">
                        <div className="KanjiOverlay__description">{currentCard.story}</div>
                    </div>

                    <div style={{ width: "100%", height: "100%" }} onMouseDown={(e) => e.stopPropagation()}>
                        <Excalidraw
                            excalidrawAPI={(api) => setExcalidrawAPI(api)}
                            viewModeEnabled={false}
                            zenModeEnabled={true}
                            gridModeEnabled={false}
                            UIOptions={{
                                canvasActions: {
                                    changeViewBackgroundColor: false,
                                    clearCanvas: false,
                                    export: false,
                                    loadScene: false,
                                    saveToActiveFile: false,
                                    toggleTheme: false,
                                    saveAsImage: false,
                                },
                            }}
                        />
                    </div>
                    <div
                        className="KanjiOverlay__resize-handle"
                        onMouseDown={handleResizeMouseDown}
                    />
                </Island>
            </div>
        </div>
    );
};
