/* eslint-disable no-console */
import React, { useState, useRef, useCallback, useEffect } from "react";
import "./KanjiOverlay.scss";

interface KanjiOverlayProps {
    onClose: () => void;
}

interface KanjiCardData {
    number: string;
    word: string;
    strokeChar: string;
    strokeVisuals: string[];
    description: React.ReactNode;
    footer: React.ReactNode;
}

const KANJI_DATA: KanjiCardData[] = [
    {
        number: "1",
        word: "one",
        strokeChar: "一",
        strokeVisuals: ["一", "一"],
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
        number: "8",
        word: "eight",
        strokeChar: "八",
        strokeVisuals: ["八"],
        description: (
            <>
                Just as the Arabic numeral “8” is composed of a small circle followed by
                a larger one, so the kanji for <strong>eight</strong> is composed of a
                short line followed by a longer line, slanting towards it but not
                touching it. And just as the “lazy 8” ∞ is the mathematical symbol for
                “infinity,” so the expanse opened up below these two strokes is
                associated by the Japanese with the sense of an{" "}
                <em>infinite expanse</em> or something “all-encompassing.” [2]
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

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | null;

export const KanjiOverlay: React.FC<KanjiOverlayProps> = ({ onClose }) => {
    const [position, setPosition] = useState({ x: 200, y: 200 });
    const [size, setSize] = useState({ width: 500, height: 350 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeHandle, setResizeHandle] = useState<ResizeHandle>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
    const resizeStartRef = useRef({
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        posX: 0,
        posY: 0,
    });

    const handleMouseDown = useCallback(
        (e: React.MouseEvent, handle?: ResizeHandle) => {
            e.preventDefault();
            e.stopPropagation();

            if (handle) {
                setIsResizing(true);
                setResizeHandle(handle);
                resizeStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    width: size.width,
                    height: size.height,
                    posX: position.x,
                    posY: position.y,
                };
            } else {
                setIsDragging(true);
                dragStartRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    posX: position.x,
                    posY: position.y,
                };
            }
        },
        [position, size],
    );

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (isDragging) {
                const deltaX = e.clientX - dragStartRef.current.x;
                const deltaY = e.clientY - dragStartRef.current.y;
                setPosition({
                    x: dragStartRef.current.posX + deltaX,
                    y: dragStartRef.current.posY + deltaY,
                });
            } else if (isResizing && resizeHandle) {
                const deltaX = e.clientX - resizeStartRef.current.x;
                const deltaY = e.clientY - resizeStartRef.current.y;
                const start = resizeStartRef.current;

                let newWidth = start.width;
                let newHeight = start.height;
                let newX = start.posX;
                let newY = start.posY;

                // Handle horizontal resizing
                if (resizeHandle.includes("e")) {
                    newWidth = Math.max(200, start.width + deltaX);
                } else if (resizeHandle.includes("w")) {
                    newWidth = Math.max(200, start.width - deltaX);
                    newX = start.posX + (start.width - newWidth);
                }

                // Handle vertical resizing
                if (resizeHandle.includes("s")) {
                    newHeight = Math.max(150, start.height + deltaY);
                } else if (resizeHandle.includes("n")) {
                    newHeight = Math.max(150, start.height - deltaY);
                    newY = start.posY + (start.height - newHeight);
                }

                setSize({ width: newWidth, height: newHeight });
                setPosition({ x: newX, y: newY });
            }
        },
        [isDragging, isResizing, resizeHandle],
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setIsResizing(false);
        setResizeHandle(null);
    }, []);

    useEffect(() => {
        if (isDragging || isResizing) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
            return () => {
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };
        }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    const renderResizeHandle = (handle: ResizeHandle) => (
        <div
            className={`kanji-resize-handle kanji-resize-handle-${handle}`}
            onMouseDown={(e) => handleMouseDown(e, handle)}
        />
    );

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

    const currentCard = KANJI_DATA[currentIndex];

    return (
        <div
            className="kanji-overlay"
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
            }}
        >
            <div className="kanji-content" onMouseDown={(e) => handleMouseDown(e)}>
                <button className="kanji-close-button" onClick={onClose} title="Close">
                    ✕
                </button>

                <div className="kanji-navigation">
                    <button className="kanji-nav-button" onClick={handlePrev}>
                        ←
                    </button>
                    <button className="kanji-nav-button" onClick={handleNext}>
                        →
                    </button>
                </div>

                <div className="kanji-header">
                    <div className="kanji-number">{currentCard.number}</div>
                    <div className="kanji-word">{currentCard.word}</div>
                </div>

                <div className="kanji-body">
                    <div className="kanji-stroke-visual">
                        {currentCard.strokeVisuals.map((char, index) => (
                            <div key={index}>{char}</div>
                        ))}
                    </div>
                    <div className="kanji-description">{currentCard.description}</div>
                </div>

                <div className="kanji-footer">{currentCard.footer}</div>
            </div>

            {/* Resize handles */}
            {renderResizeHandle("nw")}
            {renderResizeHandle("n")}
            {renderResizeHandle("ne")}
            {renderResizeHandle("e")}
            {renderResizeHandle("se")}
            {renderResizeHandle("s")}
            {renderResizeHandle("sw")}
            {renderResizeHandle("w")}
        </div>
    );
};
