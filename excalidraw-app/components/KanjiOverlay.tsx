/* eslint-disable no-console */
import React, { useState } from "react";
import { Island } from "@excalidraw/excalidraw/components/Island";
import { CloseIcon } from "@excalidraw/excalidraw/components/icons";
import { Button } from "@excalidraw/excalidraw/components/Button";
import { Excalidraw, exportToBlob } from "@excalidraw/excalidraw";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import "./KanjiOverlay.scss";
import { useRapidOCR } from "./useRapidOCR";
import { useKanjiData, type KanjiEntry } from "./useKanjiData";

interface KanjiOverlayProps {
    onClose: () => void;
}

export const KanjiOverlay: React.FC<KanjiOverlayProps> = ({ onClose }) => {
    const { kanjiData, isLoading: isDataLoading, error: dataError } = useKanjiData();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [position, setPosition] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 4 });
    const [size, setSize] = useState({ width: 600, height: 400 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % kanjiData.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) =>
            prev === 0 ? kanjiData.length - 1 : prev - 1,
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

    const currentKanji: KanjiEntry | undefined = kanjiData[currentIndex];

    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawImperativeAPI | null>(null);

    const { processImage, isLoading: isOCRLoading } = useRapidOCR();
    const [ocrResult, setOcrResult] = useState<string>("");
    const [ocrStatus, setOcrStatus] = useState<string>("");
    const [ocrImage, setOcrImage] = useState<string | null>(null);

    const checkDrawing = async () => {
        if (!excalidrawAPI || !currentKanji) return;
        const elements = excalidrawAPI.getSceneElements();
        if (elements.length === 0) {
            setOcrStatus("Please draw something first!");
            return;
        }
        try {
            setOcrStatus("Processing...");
            setOcrResult("");
            setOcrImage(null);

            const blob = await exportToBlob({
                elements,
                mimeType: "image/png",
                appState: {
                    ...excalidrawAPI.getAppState(),
                    exportWithDarkMode: false,
                    viewBackgroundColor: "#ffffff",
                },
                files: excalidrawAPI.getFiles(),
            });

            const imageUrl = URL.createObjectURL(blob);
            setOcrImage(imageUrl);

            if (isOCRLoading) {
                setOcrStatus("Model loading...");
                return;
            }

            const result = await processImage(blob);
            console.log("OCR Result:", result);
            setOcrResult(result);

            if (result.includes(currentKanji.kanji)) {
                setOcrStatus("Correct!");
            } else {
                setOcrStatus(`Incorrect. Expected: ${currentKanji.kanji}`);
            }

        } catch (error: any) {
            console.error("Error checking drawing:", error);
            setOcrStatus("Error: " + error.message);
        }
    };

    const navigateToComponent = (component: string) => {
        const targetIndex = kanjiData.findIndex((k) =>
            k.components.some(c => c.toLowerCase() === component.toLowerCase()) ||
            k.keyword_6th_ed.toLowerCase() === component.toLowerCase()
        );
        if (targetIndex !== -1) {
            setCurrentIndex(targetIndex);
        }
    };

    // Loading state
    if (isDataLoading) {
        return (
            <div className="KanjiOverlay" style={{ top: position.y, left: position.x, transform: "translate(-50%, -50%)" }}>
                <Island padding={4} className="KanjiOverlay__island">
                    <div style={{ padding: 40, textAlign: 'center' }}>Loading kanji data...</div>
                </Island>
            </div>
        );
    }

    // Error state
    if (dataError || kanjiData.length === 0) {
        return (
            <div className="KanjiOverlay" style={{ top: position.y, left: position.x, transform: "translate(-50%, -50%)" }}>
                <Island padding={4} className="KanjiOverlay__island">
                    <Button onSelect={onClose} className="sidebar__close" style={{ width: 24, height: 24 }}>{CloseIcon}</Button>
                    <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>
                        Failed to load kanji data: {dataError || "No data"}
                    </div>
                </Island>
            </div>
        );
    }

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
                        <span className="KanjiOverlay__counter">
                            #{currentKanji.id_6th_ed} / {kanjiData.length}
                        </span>
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
                            {currentKanji.components.length > 0 && <div className="KanjiOverlay__mark">*</div>}
                            {currentKanji.kanji}
                        </div>
                        <div className="KanjiOverlay__word">{currentKanji.keyword_6th_ed}</div>
                        <div className="KanjiOverlay__meta">
                            {currentKanji.stroke_count} strokes
                            {currentKanji.jlpt && ` • ${currentKanji.jlpt}`}
                        </div>
                    </div>

                    <div className="KanjiOverlay__keywords">
                        {currentKanji.components.slice(0, 6).map((component, index) => (
                            <button
                                key={index}
                                className="KanjiOverlay__keyword-chip"
                                onClick={() => navigateToComponent(component)}
                                onMouseDown={(e) => e.stopPropagation()}
                                type="button"
                            >
                                {component}
                            </button>
                        ))}
                    </div>

                    <div className="KanjiOverlay__body">
                        <div className="KanjiOverlay__readings">
                            {currentKanji.on_reading.length > 0 && (
                                <div className="KanjiOverlay__reading">
                                    <strong>On:</strong> {currentKanji.on_reading.join(", ")}
                                </div>
                            )}
                            {currentKanji.kun_reading.length > 0 && (
                                <div className="KanjiOverlay__reading">
                                    <strong>Kun:</strong> {currentKanji.kun_reading.join(", ")}
                                </div>
                            )}
                        </div>
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
                    <Button
                        onSelect={checkDrawing}
                        data-testid="check-button"
                        className="KanjiOverlay__check-button"
                        style={{ width: 24, height: 24 }}
                    >
                        Check
                    </Button>
                    <div className="KanjiOverlay__debug" style={{ marginTop: 10, fontSize: '0.8em', color: '#666' }}>
                        <div className="status">{ocrStatus}</div>
                        <div className="result" style={{ fontWeight: 'bold', color: '#333' }}>{ocrResult}</div>
                        {ocrImage && (
                            <div style={{ marginTop: 5 }}>
                                <img src={ocrImage} alt="Input" style={{ maxWidth: '100%', maxHeight: 50, border: '1px solid #ccc' }} />
                            </div>
                        )}
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
